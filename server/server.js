
const fs = require('fs');
const https = require('https');

const expressValidator = require('express-validator');
require("dotenv").config();
require("./config/database").connect();

const express = require("express");

const app = express();

app.use(express.json());
app.use(expressValidator());

const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/user');
const appRoutes = require('../routes/app');


const User = require("../model/user");

const log = require('../model/log');

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/app", appRoutes);

 

app.get('/', (req, res) => {
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.end(fs.readFileSync('client/index.html'));
})
app.get('/webrtc.js', (req, res) => {
	res.writeHead(200, {'Content-Type': 'application/javascript'});
   res.end(fs.readFileSync('client/webrtc.js'));
})

const HTTPS_PORT = process.env.API_PORT || 3000;

/*******************************************************************
*	Function Name	: webRTC signaling server
*	Description 	: Server which handles the offer and answer request 
********************************************************************/
/* library for websocket */
// var WebSocketServer = require('ws').Server;
// var wss = new WebSocketServer({ port: HTTPS_PORT });
/* to store the connection details */
var users = {};
/* to store the user list details */
var map = new Map();

const serverConfig = {
   key: fs.readFileSync('key.pem'),
   cert: fs.readFileSync('cert.pem'),
};

// Create a server for the client html page
const httpsServer = https.createServer(serverConfig, app);
httpsServer.listen(HTTPS_PORT, '0.0.0.0');

const WebSocket = require('ws');
const strat_time = require('../model/strat_time');
const WebSocketServer = WebSocket.Server;
const wss = new WebSocketServer({server: httpsServer});

wss.on('listening', function () {
	console.log("Server started...");
});

wss.on('connection', function (connection) {
	/* Sucessful connection */
	console.log("User has connected");
	connection.on('message', function (message) {

		var isjsonstring = checkisJson(message);

		if(isjsonstring == true)
		{
			var data = JSON.parse(message);	/* Parse the messages from client */
			switch (data.type) {
					/* login request from client */
				case "login":
					/* If anyone login with same user name - refuse the connection */
					if (users[data.name]) {
						/* Already same username has logged in the server */
						/* send response to client back with login failed */
						sendTo(connection, { type: "server_login", success: false });
						console.log("login failed");
	
					} else {
						/* store the connection details */
						users[data.name] = connection;
						connection.name = data.name;
						connection.otherName = null;
						/* store the connection name in the userlist */
						map.set(data.name,'online');
						/* send response to client back with login sucess */
						sendTo(connection, { type: "server_login", success: true });
						console.log("Login sucess");
						/* send updated user lists to all users */
						const obj = Object.fromEntries(map);
	
						for (var i in users) {
							sendUpdatedUserlist(users[i],[...map]);
						}
					}
	
					break;
	
					/* Offer request from client*/
				case "offer":
					/* Check the peer user has logged in the server */
					if (users[data.name]) {
						/* Get the peer connection from array */
						var conn = users[data.name];
						if (conn == null) {
							/* Error handling */
							console.log("connection is null..");
							sendTo(connection, { type: "server_nouser", success: false });
						}
						else if (conn.otherName == null) {
							/* When user is free and availble for the offer */
							/* Send the offer to peer user */
							sendTo(conn, { type: "server_offer", offer: data.offer, name: connection.name , offerType:data.offerType});
						}
						
					}
					else {
						/* Error handling with invalid query */
						sendTo(connection, { type: "server_nouser", success: false });
					}
	
					break;
	
					/* Answer request from client*/
				case "answer":
					/* Get the peer user connection details */
					// var conn = users[data.name];
	
					// if (conn != null) {
					// 	/* Send the answer back to requested user */
					// 	sendTo(conn, { type: "server_answer", answer: data.answer });
					// }
	
					// break;

					var conn = users[data.name];
		
					if (conn != null) {
						/* Send the answer back to requested user */
						sendTo(conn, { type: "server_answer", answer: data.answer });
					}

					// console.log("Sending answer to: ", data.name); 
					// //for ex. UserB answers UserA 
					// var conn = users[data.name]; 
					// console.log('answer: ',data.answer)
			  
					// if(conn != null) { 
					//    connection.otherName = data.name; 
					//    sendTo(conn, { 
					// 	  type: "answer", 
					// 	  answer: data.answer 
					//    });
					// } 
	
					/* candidate request */
				case "candidate":
					/* Get connection details */
					var conn = users[data.name];
					if (conn != null) {
						/* Send candidate details to user */
						if(conn.otherName != null)
						{
							sendTo(conn, { type: "server_candidate", candidate: data.candidate });
							console.log("candidate sending --");
						}
						
					}
					break;
	
					/* when user want to leave from room */
				case "leave":
					/* Get connection details */
					var conn = users[data.name];
					if (conn != null) {
						/* Send response back to users who are in the room */
						sendTo(conn, { type: "server_userwanttoleave" });
						sendTo(connection, { type: "server_userwanttoleave" });
						map.set(data.name,'online');
						map.set(connection.name,'online');
						/* Update the connection status with available */
						conn.otherName = null;
						connection.otherName = null;
	
						for (var i in users) {
							sendUpdatedUserlist(users[i], [...map]);
						}
						console.log("end room");
					}
	
					break;
	
					/* When user reject the offer */
				case "busy":
					/* Get connection details */
					var conn = users[data.name];
					if (conn != null) {
						/* Send response back to user */
						sendTo(conn, { type: "server_busyuser" });
					}
	
					break;
	
				case "want_to_call":
					var conn = users[data.name];
					if (conn != null) {
						if((conn.otherName != null) && map.get(data.name) == "busy")
						{
							/* User has in the room, User is can't accept the offer */
							sendTo(connection, { type: "server_alreadyinroom", success: true, name: data.name });
						}
						else
						{
							/* User is avilable, User can accept the offer */
							sendTo(connection, { type: "server_alreadyinroom", success: false, name: data.name });
						}
						
					}
					else
					{
						/* Error handling with invalid query */
						sendTo(connection, { type: "server_nouser", success: false });
					}
					break;	
				case "want_to_call_video":
					var conn = users[data.name];
					if (conn != null) {
						if((conn.otherName != null) && map.get(data.name) == "busy")
						{
							/* User has in the room, User is can't accept the offer */
							sendTo(connection, { type: "server_alreadyinroom", success: true, name: data.name });
						}
						else
						{
							/* User is avilable, User can accept the offer */
							sendTo(connection, { type: "server_alreadyinroom", success: false, name: data.name });
						}
						
					}
					else
					{
						/* Error handling with invalid query */
						sendTo(connection, { type: "server_nouser", success: false });
					}
					break;	
	
					/* Once offer and answer is exchnage, ready for a room */
					case "ready":
						
					/* Get connection details */
					var conn = users[data.name];
					if (conn != null) {
						/* Update the user status with peer name*/
						connection.otherName = data.name;
						conn.otherName = connection.name;
						map.set(data.name,'busy');
						map.set(connection.name,'busy');
						/* Send response to each users */
						sendTo(conn, { type: "server_userready", success: true, peername: connection.name });
						sendTo(connection, { type: "server_userready", success: true, peername: conn.name });
						/* Send updated user list to all existing users */
						for (var i in users) {
							sendUpdatedUserlist(users[i], [...map]);
						}
					}
	
					break;
	
					/* user quit/signout */
				case "quit":
					/* Get the user details */
					strat_time.findOne({name: data.name}, function (err, time) {
						if (err) {
							console.error(err);
						}
						if(time == null){
							return;
						}

						var logedata = new log({message: 'call details', start_time: time.start_time,type: 'time', name: data.name, from: connection.name , endedBy: connection.name, end_time: new Date()});

						logedata.save((err, data) => {
							if (err) {
							console.error(err);
							}
							console.log(data);
						});
						time.remove()
					});
					if (data.name) {
						var quit_user = data.name;
						delete users[connection.name];
						map.delete(quit_user);
	
						/* Send updated user list to all existing users */
						for (var i in users) {
							sendUpdatedUserlist(users[i], [...map]);
						}
					}
	
					break;

					case "notResponse":
						// save it to mongodb
					
				const logdata = new log({message: 'not responsed', type: 'notResponse', name: data.name, from: data.other_user });
				logdata.save((err, data) => {
						if (err) {
						console.error(err);
						}
						console.log(data);
					});

					break;

					case "call_started" :

					// save current time to mongodb
					
					var start = new strat_time({start_time: new Date(), name: data.name})
					start.save((err, data) => {
						if (err) {
						console.error(err);
						}
						console.log(data);
					});

					




					break;

					case "call_leaved" :

					console.log("dataaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" ,data);
					strat_time.findOne({name: data.name}, function (err, time) {
						if (err) {
							console.error(err);
						}
						if(time == null){
							return;
						}

						var logedata = new log({message: 'call details', start_time: time.start_time,type: 'time', name: data.name, from: data.other_user , end_time: new Date()});

						logedata.save((err, data) => {
							if (err) {
							console.error(err);
							}
							console.log(data);
						});
						time.remove()
					});

					
					
	


					// break;

	
					/* default */
				default:
					sendTo(connection, { type: "server_error", message: "Unrecognized command: " + data.type });
					break;
			}
		}
		else
		{
			console.log("not a json");
			/* ping from client, so repond with pong to get server is alive.*/
			if(message == "clientping")
			{
				console.log("clientping");
				sendTo(connection, { type: "server_pong", name: "pong" });
			}
		}


	});

	/* When socket connection is closed */
	connection.on('close', function () {
		console.log("** leaving **");
		if (connection.name) {
			var quit_user = connection.name;
			/* Remove from the connection */
			delete users[connection.name];
			map.delete(quit_user);

			if (connection.otherName) {
				/* when user is inside the room with peer user */
				var conn = users[connection.otherName];
				if (conn != null) {
					/* Update the details */
					conn.otherName = null;
					connection.otherName = null;
					/* Send the response back to peer user */
					// sendTo(conn, { type: "server_exitfrom" });
					map.set(conn.name,'online');
				}
			}

			/* Send the updated userlist to all the existing users  */
			for (var i in users) {
				sendUpdatedUserlist(users[i], [...map]);
			}
		}
	});

});

/* function to send the userlist */
function sendUpdatedUserlist(conn, message) {
	conn.send(JSON.stringify({ type: "server_userlist", name: message }));

}
/* function to send the message */
function sendTo(conn, message) {
	conn.send(JSON.stringify(message));
}
/* function to check the message is JSON or not */
function checkisJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}





// Yes, TLS is required


//all connected to the server users 
var users = {};
var allUsers = [];
// ----------------------------------------------------------------------------------------





// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls




// wss.on('connection', function(ws) {
//    ws.on('message', function(message) {

//       var data;
		
//     //accepting only JSON messages 
//       try { 
//          data = JSON.parse(message); 
//       } catch (e) { 
//          console.log("Invalid JSON"); 
//          data = {}; 
//       }
    
//       console.log('received data:', data);
//      //switching type of the user message 
//       switch (data.type) { 
//       //when a user tries to login 
//          case "login": 
//             console.log("User logged", data.name); 
     
//             console.log('if anyone is logged in with this username then refuse') 
//             if(users[data.name]) { 
//                sendTo(ws, { 
//                   type: "login", 
//                   success: false 
//                }); 
//             } else { 
//                console.log('save user connection on the server') 
//                users[data.name] = ws; 
//                allUsers.indexOf(data.name) === -1 ? allUsers.push(data.name) : console.log("This item already exists");
               
//                //console.log('all available users',JSON.stringify(users))
//                ws.name = data.name;
       
//                sendTo(ws, { 
//                   type: "login", 
//                   success: true, 
//                   allUsers:allUsers
//                }); 
//             } 
     
//          break;
     
//          case "offer": 

//          //   sendTo(connection, { type: "server_alreadyinroom", name: data.name });

//             //for ex. UserA wants to call UserB 
//             console.log("Sending offer to: ", data.name); 
     
//             //if UserB exists then send him offer details 
//             var conn = users[data.name]; 
     
//             if(conn != null) { 
//                //setting that UserA connected with UserB 
//                ws.otherName = data.name; 
       
//                sendTo(conn, { 
//                   type: "server_alreadyinroom", 
//                   offer: data.offer, 
//                   name: ws.name 
//                }); 
//             } 
     
//          break;
     
//          case "answer": 
//             console.log("Sending answer to: ", data.name); 
//             //for ex. UserB answers UserA 
//             var conn = users[data.name]; 
//             console.log('answer: ',data.answer)
      
//             if(conn != null) { 
//                ws.otherName = data.name; 
//                sendTo(conn, { 
//                   type: "answer", 
//                   answer: data.answer 
//                });
//             } 
      
//          break;
     
//          case "candidate": 
//             console.log("Sending candidate to:",data.name); 
//             var conn = users[data.name];  
      
//             if(conn != null) { 
//                sendTo(conn, { 
//                   type: "candidate", 
//                   candidate: data.candidate 
//                }); 
//             } 
      
//          break;
     
//          case "leave": 
//             console.log("Disconnecting from", data.name); 
//             var conn = users[data.name]; 
//             conn.otherName = null; 
      
//             //notify the other user so he can disconnect his peer connection 
//             if(conn != null) { 
//                sendTo(conn, { 
//                   type: "leave" 
//                }); 
//             }  
      
//          break;
     
//          default: 
//             sendTo(ws, { 
//                type: "error", 
//                message: "Command not found: " + data.type 
//             });
      
//          break; 
//       }  
//     //wss.broadcast(message);
//    });

//    ws.on("close", function() { 
//       if(ws.name) { 
//          delete users[ws.name]; 
    
//          if(ws.otherName) { 
//             console.log("Disconnecting from ", ws.otherName); 
//             var conn = users[ws.otherName]; 
//             conn.otherName = null;  
         
//             if(conn != null) { 
//                sendTo(conn, { 
//                   type: "leave" 
//                }); 
//             }  
//          } 
//       } 
//    });  

//    //ws.send("Hello world"); 
// });

function sendTo(connection, message) { 
  connection.send(JSON.stringify(message)); 
}
// wss.broadcast = function(data) {
//   this.clients.forEach(function(client) {
//     if(client.readyState === WebSocket.OPEN) {
//       client.send(data);
//     }
//   });
// };

console.log('Server running. Visit https://64.225.98.246:' + HTTPS_PORT + ' in Firefox/Chrome.\n\n\
Some important notes:\n\
  * Note the HTTPS; there is no HTTP -> HTTPS redirect.\n\
  * You\'ll also need to accept the invalid TLS certificate.\n\
  * Some browsers or OSs may not allow the webcam to be used by multiple pages at once. You may need to use two different browsers or machines.\n'
);
