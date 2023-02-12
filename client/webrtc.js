var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');
var localStream;
var myName;
var yourConn;
var uuid;
var connection;
var connectionState;
var name; 
var connectedUser;

connection = new WebSocket('wss://' + 'localhost' + ':6000');

var Send_dataChannel, peerConnection, connectedUser, Receive_dataChannel;
var username;
var chat_window_flag = false;
var incoming_popup_set = false, outgoing_popup_set = false;
var conn_offer;
var conn_answer;
var flag_send_datachannel;
var tm;
var id_wordflick;
/*********************************************************************
 * Client - Sever Ping-Pong 
**********************************************************************/
/**
 * This function will send ping request to server
 */

var configuration = {
    "iceServers": [
        {
            "urls": "stun:stun.1.google.com:19302"
        },
        {
            urls: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }
    ]
};

function ping() {
    console.log("ping sending");
    connection.send("clientping");
    tm = setTimeout(function () {
        console.log("timeout....");
        console.log("Server is down..")
        /* Sever down */
        populate_error("server");
        document.getElementById('loginerror').innerText = "Server is down.. please try again later";

    }, 7000);
}
/**
 * This function will clear timeout for ping
 */
function pong() {
    console.log("clear timeout");
    clearTimeout(tm);
}
/*********************************************************************
 * WebSocket functions. Open and Messages
**********************************************************************/
/**
 * This function will check the websocket connection error.
 */
 connection.onerror = function (err) {
    console.log("connection.onerror:",err);
    document.getElementById('loginerror').innerText = "Server is down.. please try later";
    populate_error("server");
};
/**
 * This function will check the websocket connection open.
 * When connection sucessfull , the user name send to server.
 */


connection.onopen = function () { 
    console.log("connection is fine");
    setInterval(ping, 10000);
    document.getElementById('messages').innerHTML = '';
  console.log("Connected to the signaling server"); 
};

// connection.onopen = function () {
//     console.log("connection is fine");
//     setInterval(ping, 10000);
//     document.getElementById('messages').innerHTML = '';
// };
/**
 * This function will handle all the messages from server.
 * Main functiion to receive data from server.
 */
connection.onmessage = function (message) {

    console.log("message from server = ", message.data);
    var data = JSON.parse(message.data);

    switch (data.type) {

        case "server_pong":
            if (data.name == "pong") {
                pong();
            }
            break;

        case "server_login":
            onLogin(data.success);
            break;

        case "server_offer":
            onOffer(data.offer, data.name);
            break;

        case "server_answer":
            onAnswer(data.answer);
            break;

        case "server_candidate":
            onCandidate(data.candidate);
            break;

        case "server_userlist":
            LoadOnlineUserList(data.name);
            break;

        case "server_userready":
            user_is_ready(data.success, data.peername);
            break;

        case "server_userwanttoleave":
            DisposeRoom();
            break;

        case "server_busyuser":
            busy_user();
            break;

        case "server_exitfrom":
            left_from_server();
            break;
        
     

        case "server_error":
            break;

        case "server_nouser":
            break;

        case "login": 
            handleLogin(data.success,data.allUsers); 
          break; 
           //when somebody wants to call us 
          case "offer": 
            console.log('inside offer')
            handleOffer(data.offer, data.name); 
          break; 
          case "answer": 
            console.log('inside answer')
            handleAnswer(data.answer); 
          break; 
           //when a remote peer sends an ice candidate to us 
          case "candidate": 
            console.log('inside handle candidate')
            handleCandidate(data.candidate); 
          break; 
          case "leave": 
            handleLeave(); 
          break; 
        default:
            break;
    }
};
/*********************************************************************
 *  Functions related to Form login 
 **********************************************************************/
 const form  = document.getElementById('signup');
 /**
  * This is a click event when press enter from keybord
  * accept key event from keyboard
  * process the send message function
  */
  document.addEventListener('keydown', function (key) {
     if (key.which === 13) {
         SendMessage();
     }
 });
 /**
  * This function will handle the login from UI
  * If it is success, it will initiate the connection.
  */
 form.addEventListener('submit', (event) => {
     // stop form submission
     event.preventDefault();
     // handle the form data
     var username_obj = form.elements['Userame'];
     username = username_obj.value; 
     document.getElementById('divChatName_username').innerHTML = username;
     send({
         type: "login",
         name: username
     });
 });
/*********************************************************************
 *  WebRTC related Functions (Creation of RTC peer connection, Offer, ICE, SDP, Answer etc..)
 **********************************************************************/
/**
 * This function will handle the data channel open callback.
 */
 var onReceive_ChannelOpenState = function (event) {
    flag_send_datachannel = false;
    console.log("dataChannel.OnOpen", event);

    if (Receive_dataChannel.readyState == "open") {
        /* */
    }
};
/**
 * This function will handle the data channel message callback.
 */
var onReceive_ChannelMessageCallback = function (event) {
    console.log("dataChannel.OnMessage:", event);
    UpdateChatMessages(event.data, false);
};
/**
 * This function will handle the data channel error callback.
 */
var onReceive_ChannelErrorState = function (error) {
    console.log("dataChannel.OnError:", error);
};
/**
 * This function will handle the data channel close callback.
 */
var onReceive_ChannelCloseStateChange = function (event) {
    console.log("dataChannel.OnClose", event);
};
/**
 * Registration of data channel callbacks
 */
var receiveChannelCallback = function (event) {
    Receive_dataChannel = event.channel;
    Receive_dataChannel.onopen = onReceive_ChannelOpenState;
    Receive_dataChannel.onmessage = onReceive_ChannelMessageCallback;
    Receive_dataChannel.onerror = onReceive_ChannelErrorState;
    Receive_dataChannel.onclose = onReceive_ChannelCloseStateChange;
};
/**
 * This function will create RTCPeerConnection object.
 */

var handleonnegotiatioCallback = function(event){
    /* if you want , use this function for handleonnegotiatioCallback  */
};
var handlestatechangeCallback = function (event) {
     /* if you want , use this function for webrtc state change event  */
    const state = peerConnection.iceConnectionState;
    if (state === "failed" || state === "closed") {
       /* handle state failed , closed */
    } else if (state === "disconnected") {
       /* handle state disconnected */
    }
};
/**
 * This function will handle ICE candidate event. 
 */
function icecandidateAdded(ev) {
    console.log("ICE candidate = "+ ev.candidate);
    if (ev.candidate) {
        send({
            type: "candidate",
            candidate: ev.candidate
        });
    }
};
/**
 * This function will handle the data channel open callback.
 */
 var onSend_ChannelOpenState = function (event) {
    flag_send_datachannel = true;
    console.log("dataChannel.OnOpen", event);
    if (Send_dataChannel.readyState == "open") {
        /* */
    }
};
/**
 * This function will handle the data channel message callback.
 */
 var onSend_ChannelMessageCallback = function (event) {
    console.log("dataChannel.OnMessage:", event);
    UpdateChatMessages(event.data, false);
};
/**
 * This function will handle the data channel error callback.
 */
var onSend_ChannelErrorState = function (error) {
    console.log("dataChannel.OnError:", error);
};
/**
 * This function will handle the data channel close callback.
 */
var onSend_ChannelCloseStateChange = function (event) {
    console.log("dataChannel.OnClose", event);
};
/**
 * This function will create data channel
 * when user want a room with other user.
 */
function Create_DataChannel(name) {

    document.getElementById('dynamic_progress_text').setAttribute('data-loading-text', "Creating an channel with user .. Please wait..");
    const dataChannelOptions = {
        ordered: false,             // do not guarantee order
        maxPacketLifeTime: 3000,    // in milliseconds
    };

    var channelname = "webrtc_label_" + name;
    Send_dataChannel = peerConnection.createDataChannel(channelname, dataChannelOptions);
    console.log("Created DataChannel dataChannel = "+Send_dataChannel);

    Send_dataChannel.onerror = onSend_ChannelErrorState;
    Send_dataChannel.onmessage = onSend_ChannelMessageCallback;
    Send_dataChannel.onopen = onSend_ChannelOpenState;
    Send_dataChannel.onclose = onSend_ChannelCloseStateChange;
}
/**
 * This function will create the webRTC offer request for other user.
 */
 function creating_offer() {
    document.getElementById('dynamic_progress_text').setAttribute('data-loading-text', "Requesting with user .. Please wait..");
    try {
        const offer =  peerConnection.createOffer({iceRestart:true});
         peerConnection.setLocalDescription(offer);

        console.log("creating offer ---");
        console.log("offer = "+ peerConnection.localDescription);
        send({
            type: "offer",
            offer: offer
        });

    } catch (e) {
        clear_outgoing_modal_popup(); /*remove modal when any error occurs */
        alert("Failed to create offer:" + e);
    }
}
/**
 * This function will send webRTC answer to server for offer request.
 */
function make_answer() {
    //create RTC peer connection from receive end
    // create_webrtc_intial_connection();
    //create a data channel bind
    yourConn.ondatachannel = receiveChannelCallback;
    yourConn.setRemoteDescription(new RTCSessionDescription(conn_offer));
    creating_answer();
}
/**
 * This function will create the webRTC answer for offer.
 */
function creating_answer() {

    yourConn.createAnswer()
    .then(function(answer) {
       

        yourConn.setLocalDescription(answer);
        conn_answer = answer;
        send({
            type: "answer",
            answer: conn_answer
        });
    })
    .catch(function(err) {
        alert("answer is failed");
        clear_incoming_modal_popup(); /*remove modal when any error occurs */
  });
}
/**
 * This function will handle when another user answers to our offer .
 */
 function onAnswer(answer) {
     console.log("when another user answers to  offer => answer = "+ answer);
    //  document.getElementById('dynamic_progress_text').setAttribute('data-loading-text', "Waiting for a answer from user..Please wait ..");
     yourConn.setRemoteDescription(new RTCSessionDescription(answer)); 
    //  alert('ff')
    send({
        type: "ready"
    });
}
/**
 * This function will handle when when we got ice candidate from another user.
 */
function onCandidate(candidate) {
        console.log("onCandidate => candidate = "+ candidate);
        yourConn.addIceCandidate(new RTCIceCandidate(candidate));
}
/**
 * This function will send the user message to server.
 * Sending message will be in JSON format.
 */
 function send(message) {
    if (connectedUser) {
        message.name = connectedUser;
    }
    connection.send(JSON.stringify(message));
};
/**********************************************************************************
 *  Button Events and UI logics
 **********************************************************************************/
/**
 * This function will handle the login message from server
 * If it is success, it will initiate the webRTC RTCPeerconnection.
 */
  function onLogin(success) {
    if (success === false) {
        alert("Username is already taken .. choose different one");
    } else {
        var constraints = {
            video: true,
            audio: true
          };
        
          /* START:The camera stream acquisition */
          if(navigator.mediaDevices.getUserMedia) {
           navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
          } else {
            alert('Your browser does not support getUserMedia API');
          }
        Update_user_status("clientuser_status","online");
        document.getElementById('signupStart').setAttribute('style', 'display:none');
    }
}
/**
 * This jQuery function will check the modal popup.
 * If the popup is still avaible after 30 second , then
 * it will be forcefully remove from screen and update to user.
 */
$('#modalNotificationList').on('show.bs.modal', function () {
    var myModal = $(this);
    clearTimeout(myModal.data('hideInterval'));
    myModal.data('hideInterval', setTimeout(function () {
        if (chat_window_flag != true && outgoing_popup_set == true) {
            myModal.modal('hide').data('bs.modal', null);
            populate_error("noresponse");
            outgoing_popup_set = false;
        }
    }, 30000));
});
/**
 * This jQuery function will check the modal popup.
 * If the popup is still avaible after 30 second , then
 * it will be forcefully remove from screen and update to user.
 */
$('#incoming_call_Modal').on('show.bs.modal', function () {
    var myModal = $(this);
    clearTimeout(myModal.data('hideInterval'));
    myModal.data('hideInterval', setTimeout(function () {
        if (chat_window_flag != true && incoming_popup_set == true) {
            myModal.modal('hide').data('bs.modal', null);
            populate_error("noresponse");
            outgoing_popup_set = false;
        }
    }, 30000));
});
/**
 * This function will create the dynamic bootstrap modal to show 
 * the incoming room request from other user. (callee side)
 * This will activate the accept and reject button along with the popup.
 */
function create_request_room_Modal(name) {
    var html = '<div class="vertical-alignment-helper">' +
        '<div class="modal-dialog modal-lg vertical-align-center">' +
        '<div class="modal-content">' +
        '<div class="modal-header">' +
        '<h4 class="modal-title" id="myModalLabel1"><strong>Incoming chat room request </strong></h4>' +
        '</div>' +
        '<div class="modal-body">' +
        '<div class="row intro-banner-vdo-play-btn pinkBg"><i class="glyphicon glyphicon-play whiteText" aria-hidden="true"></i>'+
        `<img src="https://www.shutterstock.com/image-vector/avatar-man-icon-symbol-simple-260nw-1701935266.jpg" class="friend-pic-new rounded-circle"/><span class="ripple pinkBg"></span><span class="ripple pinkBg"></span><span class="ripple pinkBg"></span></div>`+
        '<div id="incoming-call-page" class="page text-center">' +
        '<div id="dynamictext" class="word"></div>' +
        '<div class="row incoming-button-calls">' +
        '<div class="col-xs-2">' +
        '<button style="margin-right:16px" class="btn btn-success btn-lg" id="incoming-accpt-request" type="button" onclick="make_answer()">' +
        '<span class="glyphicon glyphicon-facetime-video"></span>Accept' +
        '</button>' +
        '</div>' +
        '<div class="col-xs-2">' +
        '<button style="margin-right:16px" data-dismiss="modal" class="btn btn-danger btn-lg" id="incoming-end-call" type="button" onclick="reject_answer()">' +
        '<span class="glyphicon glyphicon-phone-alt"></span>Reject' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="modal-footer"></div>' +
        '</div>' +
        '</div>' +
        '</div>';

    document.getElementById('incoming_call_Modal').innerHTML = html;
    document.getElementById('dynamictext').innerText = "";
    //document.getElementById('peer_user_name_incoming').innerHTML = "<li class='loading' data-loading-text='"+ name +"is requesting for a chat ..'></li>";
    var string = name +" is requesting for a chat ..";
    var words = [string];
    console.log("*********calling wordflick ***********");
    id_wordflick = wordflick(words);

    $("#incoming_call_Modal").modal('show');
    incoming_popup_set = true;
}

function wordflick (words) {

    var part ='',
    i = 0,
    offset = 0,
    len = words.length,
    forwards = true,
    skip_count = 0,
    skip_delay = 15,
    speed = 70;

    return window.setInterval(function () {
      if (forwards) {
        if (offset >= words[i].length) {
          ++skip_count;
          if (skip_count == skip_delay) {
            forwards = false;
            skip_count = 0;
          }
        }
      }
      else {
        if (offset == 0) {
          forwards = true;
          i++;
          offset = 0;
          if (i >= len) {
            i = 0;
          }
        }
      }
      part = words[i].substr(0, offset);
      if (skip_count == 0) {
        if (forwards) {
          offset++;
        }
        else {
          offset--;
        }
      }
      if(part =='')
      {
        document.getElementById('dynamictext').innerText = words[i].substr(0, 1);
        //$('.word').text(words[i].substr(0, 1));
      }
      else
      {
        document.getElementById('dynamictext').innerText = part;
        //$('.word').text(part);
      }
    },speed);
  };

/**
 * This function will create the dynamic bootstrap modal to show 
 * the progress of the webRTC connection (caller side)
 * This will activate the loading icon and text message to user.
 */
function Create_Popup_Notifications() {

    /* creation of modal pop up to show the progress */
    var html = '<div class="vertical-alignment-helper">'
        + '<div class="modal-dialog modal-lg vertical-align-center">'
        + '<div class="modal-content">'
        + '<div class="modal-header">'
        + '<h4 class="modal-title" id="myModalLabel2"><strong>Creating room request</strong></h4>'
        + '</div>'
        + '<div class="modal-body">'
        + `<div class="popup text-center">`
        +'<div class="spinner-grow text-primary" role="status"><span class="sr-only">Loading...</span></div>'
        +'<div class="spinner-grow text-secondary" role="status"><span class="sr-only">Loading...</span></div>'
        +'<div class="spinner-grow text-primary" role="status"><span class="sr-only">Loading...</span></div>'
        +'<div class="spinner-grow text-secondary" role="status"><span class="sr-only">Loading...</span></div>'
        +'<div class="spinner-grow text-primary" role="status"><span class="sr-only">Loading...</span></div>'
        +'<div class="spinner-grow text-secondary" role="status"><span class="sr-only">Loading...</span></div>'
        +'<div class="spinner-grow text-primary" role="status"><span class="sr-only">Loading...</span></div>'
        +'<div class="spinner-grow text-secondary" role="status"><span class="sr-only">Loading...</span></div>'
        + `</div>`
        + `<li id="dynamic_progress_text" class="loading"></li>`
        + '</div>'
        + '<!-- footer content -->'
        + '<div class="modal-footer"></div>'
        + '</div>'
        + '</div>'
        + '</div>';

    document.getElementById('modalNotificationList').innerHTML = html;
    $("#modalNotificationList").modal('show');
    outgoing_popup_set = true;
}

/**
 * This function will throw messages to user when other 
 * user has left from the Browser/Connection (If user already in call)
 */
function left_from_server() {
    if (chat_window_flag == true) {
        Delete_webrtc_connection();
        //you are in a call
        document.getElementById('divStart').removeAttribute('style');
        document.getElementById('chatPanel').setAttribute('style', 'display:none');
        populate_error("user_unavailble");
    }
}

/**
 * This function will create a message for user dyanmically
 * when the room is created sucessfully.
 */
function update_connection_status(textid) {
    var messageDisplay = '';
    var message;
    if(textid == "success")
    {
        message = "Chat room is created sucessfully.. Happy chatting !!.";
    }
    else if(textid == "datachannel")
    {
        message = "Error: WebRTC Data channel is not open.. Please leave room and try again";
    }
    else
    {
        message = "NA";
    }
    messageDisplay += "<div class='alert alert-success' role='alert'>" +
        "<p class='mb-0'>"+message+"</p>" +
        "</div>";

    document.getElementById('messages').innerHTML = messageDisplay;
}
/**
 * This function will terminate the webRTC room.
 */
function DisposeRoom() {
    Delete_webrtc_connection();
    chat_window_flag = false;
    document.getElementById('divStart').removeAttribute('style');
    document.getElementById('chatPanel').setAttribute('style', 'display:none');
    populate_error("endcall");
}
/**
 * This function will delete the webRTC connections.
 */
function Delete_webrtc_connection()
{
    Update_user_status("clientuser_status","online");
    /* clear the chat window */
    document.getElementById('messages').innerHTML ='';
    //close all the data channel
    if(flag_send_datachannel == true)
    {
        /* close the send datachannel */
        Send_dataChannel.close();
        flag_send_datachannel = false;
    }else
    {
        /* close the receive datachannel */
        if(Receive_dataChannel)
        {
            Receive_dataChannel.close();
        }
    }

    /* close the RTCpeerConnection */
    peerConnection.close();
    peerConnection = null;
}
/**
 * This function will handle UI when other user reject the webRTC offer.
 */
function busy_user() {
    clear_outgoing_modal_popup();
    chat_window_flag = false;
    outgoing_popup_set = false
    populate_error("reject");
    Delete_webrtc_connection();
}
/**
 * This function will handle sliding of bootstrap UI message.
 */
function slide_down_error() {
    $("#success-alert").fadeTo(2000, 500).slideUp(500, function () {
        $("#success-alert").slideUp(500);
    });
}
/**
 * This function will handle all the UI messages based on the scenario.
 */
function populate_error(errorid) {
    var msg = '';
    var text;

    if (errorid == "reject") {
        text = "User has rejected your request .. it seems user is busy now !!";
    }
    else if (errorid == "inaroom") {
        text = "If you want another room, please leave this room first !!";
    }
    else if (errorid == "server") {
        text = "Server is down, please try again later !!";
    }
    else if (errorid == "noresponse") {
        text = "No response from user .. User may be offline now !!";
    }
    else if (errorid == "endforcecall") {
        text = "Chat room is closed by other user !!";
    }
    else if (errorid == "endcall") {
        text = "You have closed the chat room !!";
    }
    else if (errorid == "user_unavailble") {
        text = "Other user has left from the chat !!";
    }
    else if (errorid == "busyuser") {
        text = "Peer user is in another room.. please try later !!";
    }
    else {
        text = "NA";
    }
    msg += '<button type="button" class="close" data-dismiss="alert">x</button>' +
        '<strong>Note: </strong>' + text + '';

    document.getElementById('success-alert').innerHTML = msg;
    slide_down_error();
}
/**
 * This function will send messages to server
 *  when user reject the offer from other user.
 */
function reject_answer() {

    send({
        type: "busy"
    });

    clear_incoming_modal_popup();
    chat_window_flag = false;
    incoming_popup_set = false;
}
/**
 * This function will send message to server
 * if user want to leave from the room.
 */
function Leaveroom() {

    send({
        type: "leave"
    });
}
/**
 * This function will send offer to peer user 
 * when user click the chat window
 */
function video_user(name) {
    if (chat_window_flag == true) {
        //already in a room
        populate_error("inaroom");
    }
    else {
        var otherUsername = name;
        connectedUser = otherUsername;

        if (otherUsername.length > 0) {
            
            send({
                type: "want_to_call_video",
                name: otherUsername
            });
        }
    }
}



function request_call(name) {
    
    call_user(name)
}


// callBtn.addEventListener("click", function () {
//     console.log('inside call button')
  
//     var callToUsername = document.getElementById('callToUsernameInput').value;
      
//     if (callToUsername.length > 0) { 
//       connectedUser = callToUsername; 
//       console.log('nameToCall',connectedUser);
//       console.log('create an offer to-',connectedUser)
  
      
//       var connectionState2 = yourConn.connectionState;
//       console.log('connection state before call beginning',connectionState2)
//       var signallingState2 = yourConn.signalingState;
//     //console.log('connection state after',connectionState1)
//     console.log('signalling state after',signallingState2)
//       yourConn.createOffer(function (offer) { 
//          send({
//             type: "offer", 
//             offer: offer 
//          }); 
      
//          yourConn.setLocalDescription(offer); 
//       }, function (error) { 
//          alert("Error when creating an offer",error); 
//          console.log("Error when creating an offer",error)
//       }); 
//       document.getElementById('callOngoing').style.display = 'block';
//       document.getElementById('callInitiator').style.display = 'none';
  
//     } 
//     else 
//       alert("username can't be blank!")
//   });
function call_user(name) {
    console.log('inside call button')

    var callToUsername = name;
  
	
  if (callToUsername.length > 0) { 
    connectedUser = callToUsername; 
    console.log('nameToCall',connectedUser);
    console.log('create an offer to-',connectedUser)
    // yourConn = new RTCPeerConnection(peerConnectionConfig);
    var connectionState2 = yourConn.connectionState;
    console.log('connection state before call beginning',connectionState2)
    var signallingState2 = yourConn.signalingState;
  //console.log('connection state after',connectionState1)
  console.log('signalling state after',signallingState2)
    yourConn.createOffer(function (offer) { 
       send({
          type: "offer", 
          offer: offer 
       }); 
    
       yourConn.setLocalDescription(offer); 
    }, function (error) { 
       alert("Error when creating an offer",error); 
       console.log("Error when creating an offer",error)
    }); 
    document.getElementById('callOngoing').style.display = 'block';
    document.getElementById('callInitiator').style.display = 'none';

  } 
  else 
    alert("username can't be blank!")

    // if (chat_window_flag == true) {
    //     //already in a room
    //     populate_error("inaroom");
    // }
    // else {
    //     var otherUsername = name;
    //     connectedUser = otherUsername;

    //     if (otherUsername.length > 0) {
            
    //         send({
    //             type: "want_to_call",
    //             name: otherUsername
    //         });
    //     }
    // }
}
/**
 * This function will handle when somebody wants to call us 
 */
function onOffer(offer, name) {

    console.log("somebody wants to call us  => offer = "+ offer);
    connectedUser = name;
    conn_offer = offer;
    /*create a popup to accept/reject room request*/
    create_request_room_Modal(name);
}
/**
 * This function will remove all the UI popup when the 
 * room is created sucessfully.
 */
function user_is_ready(val, peername) {
    if (val == true) {
        document.getElementById('divChatName_peername').innerHTML = peername;

        //clear all dynamic datas
        clear_incoming_modal_popup();
        clear_outgoing_modal_popup();
        loadAllEmoji();
        update_connection_status("success");

        Update_user_status("clientuser_status","busy");
        Update_user_status("peeruser_status","busy");
        
        activate_chat_window();

        chat_window_flag = true;
        incoming_popup_set = false;
        outgoing_popup_set = false;
    }

}
/**
 * This function will clear the incoming offer popup.
 */
function clear_incoming_modal_popup() {
    window.clearInterval(id_wordflick);
    $('#incoming_call_Modal').modal('hide').data('bs.modal', null);
    document.getElementById('incoming_call_Modal').innerHTML = '';
}
/**
 * This function will clear the outgoing popup.
 */
function clear_outgoing_modal_popup() {
    $('#modalNotificationList').modal('hide').data('bs.modal', null);
    document.getElementById('modalNotificationList').innerHTML = '';
}
/**
 * This function will activate the chat window.
 */
function activate_chat_window() {
    // document.getElementById('otherElements').hidden = false;
    document.getElementById('chatPanel').removeAttribute('style');
    document.getElementById('divStart').setAttribute('style', 'display:none');

}
/**
 * This function will enable the send icon.
 */
function ChangeSendIcon(control) {
    if (control.value !== '') {
        document.getElementById('send').removeAttribute('style');
    }
    else {
        document.getElementById('send').setAttribute('style', 'display:none');
    }
}
/**
 * This function will load all the emoji.
 */
function loadAllEmoji() {
    var emoji = '';
    for (var i = 128512; i <= 128566; i++) {
        emoji += `<a href="#" style="font-size: 22px;" onclick="getEmoji(this)">&#${i};</a>`;
    }

    document.getElementById('smiley').innerHTML = emoji;
}
/**
 * This function will show all the emoji.
 */
function showEmojiPanel() {

    if ((document.getElementById('emoji').style.display == 'none')) {
        document.getElementById('emoji').removeAttribute('style');
    }
    else {
        //double click
        hideEmojiPanel();
    }
}
/**
 * This function will hide the emoji panel.
 */
function hideEmojiPanel() {
    document.getElementById('emoji').setAttribute('style', 'display:none;');
}
/**
 * This function will get the emoji for chat.
 */
function getEmoji(control) {
    document.getElementById('txtMessage').value += control.innerHTML;
    ChangeSendIcon(document.getElementById('txtMessage'));
}
/**
 * This function will update the messages when user type any of 
 * the text and press enter/click send.
 */
function UpdateChatMessages(txtmessage, client) {

    var messageDisplay = '';

    if (client == true) {
        messageDisplay += "<div class='row'>" +
            "<div class='col-2 col-sm-1 col-md-1'>" +
            `<img src="https://www.shutterstock.com/image-vector/avatar-man-icon-symbol-simple-260nw-1701935266.jpg" class='chat-pic rounded-circle' />`+
            "</div>" +
            "<div class='col-6 col-sm-7 col-md-7'>" +
            "<p class='receive'>" + txtmessage + "</p>" +
            "</div>" +
            "</div>";

        document.getElementById('messages').innerHTML += messageDisplay;
    }
    else {
        messageDisplay += "<div class='row justify-content-end'>" +
            "<div class='col-6 col-sm-7 col-md-7'>" +
            "<p class='sent float-right'>" + txtmessage + "</p>" +
            "</div>" +
            "<div class='col-2 col-sm-1 col-md-1'>" +
            `<img src="https://www.shutterstock.com/image-vector/avatar-man-icon-symbol-simple-260nw-1701935266.jpg" class='chat-pic rounded-circle' />`+
            "</div>" +
            "</div>";

        document.getElementById('messages').innerHTML += messageDisplay;
    }
    document.getElementById('messages').scrollTo(0, document.getElementById('messages').scrollHeight);
}
/**
 * This function will send the messages with webRTC data channel.
 */
function SendMessage() {

    var txtmessage = document.getElementById('txtMessage').value;
    if (txtmessage != '') {

        if (flag_send_datachannel == true) {
            Send_dataChannel.send(txtmessage);
            UpdateChatMessages(txtmessage, true);
            /* remove current text */
            document.getElementById('txtMessage').value = '';
            document.getElementById('txtMessage').focus();
        }
        else if (flag_send_datachannel == false)
        {
            Receive_dataChannel.send(txtmessage);
            UpdateChatMessages(txtmessage, true);
            /* remove current text */
            document.getElementById('txtMessage').value = '';
            document.getElementById('txtMessage').focus();
        }
        else
        {
            update_connection_status("datachannel");
        }
    }
}
/**
 * This function will populate the online userlist from the server.
*/
function LoadOnlineUserList(username_array) {
    
    /* convert the json to Map */
    const map2 = new Map(username_array);
    /* Count of online user -> server send all user list , we have to remove our name from that list */
    document.getElementById('onlineusers').innerHTML = '<span class="indicator label-success"></span>' +
                                                        'online users (' + (map2.size - 1) + ')';
    document.getElementById('lstChat').innerHTML = "";

    if (map2.size > 1) {
        
        var id = 0;

        for (let [key, value] of map2) {
            if (username != key) { 
                var id_name = 'online_status_'+id; /* Used for dynamic id */
                /*populate the sidebar online users list dynamically*/
                document.getElementById('lstChat').innerHTML += "<li class='list-group-item list-group-item-action'>" +
                    "<div class='row'>" +
                    "<div class='col-md-2'>" +
                    `<img src="https://www.shutterstock.com/image-vector/avatar-man-icon-symbol-simple-260nw-1701935266.jpg" class='friend-pic rounded-circle' />`+
                    "</div>" +
                    // "<button id = 'callBtn' class = 'btn-success btn'>" 
                    "<div class='col-md-7' style='cursor:pointer;' onclick='request_call(\"" + key + "\")'>" +
                    "<div class='name'>" + key + "</div>" +
                    "<div class='under-name'><span id="+id_name+" class='indicator label-success'></span>" + value + "</div>" +
                    "</div>" +
                    "<div class='col-md-3 mt-3 video-icon' onclick='video_user(\"" + key + "\")'>" + '<i class="fas fa-video"></i>' + "</div>" +
                    "</div>" +
                    "</li>";
                    
                Update_user_status(id_name, value);    
                id++;   
            }
        }
    }
    else
    {
            /* Only one user name present ie. only client */
            if (map2.key == username) {
                document.getElementById('lstChat').innerHTML = "";
                console.log("single user = ", map2.key);
            }
    }
}
function Update_user_status(id_name, value)
{
    switch(value)
    {
        /* handle the user status */
        case "online":
            document.getElementById(id_name).classList.replace('label-danger', 'label-success');
            break;
        case "busy":
            document.getElementById(id_name).classList.replace('label-success','label-danger'); 
            break;
        default:
            document.getElementById(id_name).classList.add('label-success');
            break;
    }
}
/*******************************************************************
 * End of file
 ********************************************************************/

var peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:stun.stunprotocol.org:3478'},
    {'urls': 'stun:stun.l.google.com:19302'},
  ]
};



// connection.onmessage = gotMessageFromServer;

// document.getElementById('otherElements').hidden = true;
// var usernameInput = document.querySelector('#usernameInput'); 
// var usernameShow = document.querySelector('#showLocalUserName'); 
// var showAllUsers = document.querySelector('#allUsers');
// var remoteUsernameShow = document.querySelector('#showRemoteUserName');
// var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn'); 
// var hangUpBtn = document.querySelector('#hangUpBtn');


// var loginBtn = document.querySelector('#loginBtn');
// // Login when the user clicks the button 
// loginBtn.addEventListener("click", function (event) { 
//   name = usernameInput.value; 
//   // usernameShow.innerHTML = "Hello, "+name;
//   if (name.length > 0) { 
//      send({ 
//         type: "login", 
//         name: name 
//      }); 
//   } 
 
// });


/* START: Register user for first time i.e. Prepare ground for webrtc call to happen */
function handleLogin(success,allUsers) { 
  if (success === false) { 
    alert("Ooops...try a different username"); 
  } 
  else { 
    alert('welcome...')
    // var allAvailableUsers = allUsers.join();
    // console.log('All available users',allAvailableUsers)
    // showAllUsers.innerHTML = 'Available users: '+allAvailableUsers;


    var constraints = {
        video: true,
        audio: true
      };
    
      /* START:The camera stream acquisition */
      if(navigator.mediaDevices.getUserMedia) {
       navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
      } else {
        alert('Your browser does not support getUserMedia API');
      }

      document.getElementById('otherElements').hidden = false;

    // Update_user_status("clientuser_status","online");
    // document.getElementById('signupStart').setAttribute('style', 'display:none');


  /* END:The camera stream acquisition */
  }
}
/* END: Register user for first time i.e. Prepare ground for webrtc call to happen */


 function getUserMediaSuccess(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
  yourConn = new RTCPeerConnection(peerConnectionConfig);

  connectionState = yourConn.connectionState;
  console.log('connection state inside getusermedia',connectionState)
  yourConn.onicecandidate = function (event) {     
      console.log('onicecandidate inside getusermedia success', event.candidate)
      if (event.candidate) { 
          send({ 
              type: "candidate", 
              candidate: event.candidate 
            }); 
        } 
    }; 
    yourConn.ontrack =  gotRemoteStream;
    yourConn.addStream(localStream);
}



/* START: Initiate call to any user i.e. send message to server */

/* END: Initiate call to any user i.e. send message to server */


/* START: Recieved call from server i.e. recieve messages from server  */
function gotMessageFromServer(message) {
  console.log("Got message", message.data); 
  var data = JSON.parse(message.data); 
 
  switch(data.type) { 
    case "login": 
      handleLogin(data.success,data.allUsers); 
    break; 
     //when somebody wants to call us 
    case "offer": 
      console.log('inside offer')
      handleOffer(data.offer, data.name); 
    break; 
    case "answer": 
      console.log('inside answer')
      handleAnswer(data.answer); 
    break; 
     //when a remote peer sends an ice candidate to us 
    case "candidate": 
      console.log('inside handle candidate')
      handleCandidate(data.candidate); 
    break; 
    case "leave": 
      handleLeave(); 
    break; 
    default: 
      break; 
  } 

//   connection.onerror = function (err) { 
//     console.log("Got error", err); 
//   };

}

function send(msg) { 
  //attach the other peer username to our messages 
  if (connectedUser) { 
    msg.name = connectedUser; 
  } 
  console.log('msg before sending to server',msg)
  connection.send(JSON.stringify(msg)); 
};

/* START: Create an answer for an offer i.e. send message to server */
function handleOffer(offer, name) { 
//   document.getElementById('callInitiator').style.display = 'none';
  document.getElementById('callReceiver').style.display = 'block';

  /* Call answer functionality starts */
  answerBtn.addEventListener("click", function () { 

  connectedUser = name; 
  yourConn.setRemoteDescription(new RTCSessionDescription(offer)); 
 
  //create an answer to an offer 
  yourConn.createAnswer(function (answer) { 
 
   
    send({ 
      type: "answer", 
        answer: answer 
    });
    yourConn.setLocalDescription(answer); 
  }, function (error) { 
     alert("Error when creating an answer"); 
  }); 
  document.getElementById('callReceiver').style.display = 'none';
  document.getElementById('callOngoing').style.display = 'block';
});
/* Call answer functionality ends */
/* Call decline functionality starts */
declineBtn.addEventListener("click", function () {
  document.getElementById('callInitiator').style.display = 'block';
  document.getElementById('callReceiver').style.display = 'none';

});

/*Call decline functionality ends */
};

 function gotRemoteStream(event) {
  console.log('got remote stream');
  remoteVideo.srcObject = event.streams[0];
}

function errorHandler(error) {
  console.log(error);
}

//when we got an answer from a remote user 
function handleAnswer(answer) { 
  console.log('answer: ', answer)
  // open video stream between two users webrtc server
  yourConn.setRemoteDescription(new RTCSessionDescription(answer)); 
};

//when we got an ice candidate from a remote user 
function handleCandidate(candidate) { 
  yourConn.addIceCandidate(new RTCIceCandidate(candidate)); 
};

//hang up
hangUpBtn.addEventListener("click", function () { 
  send({ 
     type: "leave" 
  }); 
 
  handleLeave(); 

  document.getElementById('callOngoing').style.display = 'none';
  document.getElementById('callInitiator').style.display = 'block';
});

function handleLeave() { 
  connectedUser = null; 
  remoteVideo.src = null; 
  var connectionState = yourConn.connectionState;
  var signallingState = yourConn.signalingState;
  console.log('connection state before',connectionState)
  console.log('signalling state before',signallingState)
  yourConn.close(); 
  yourConn.onicecandidate = null; 
  yourConn.onaddstream = null; 
  var connectionState1 = yourConn.connectionState;
  var signallingState1 = yourConn.signalingState;
  console.log('connection state after',connectionState1)
  console.log('signalling state after',signallingState1)
};

