const User = require('../model/user');
const jwt = require('jsonwebtoken'); // to generate signed token
const expressJwt = require('express-jwt'); // for authorization check

// using promise
exports.signup = (req, res) => {
    console.log("req.body", req.body);
    const user = new User(req.body);
    user.save((err, user) => {
        if (err) {
            return res.status(400).json({
                // error: errorHandler(err)
                error:err
            });
        }
        user.salt = undefined;
        // user.app = undefined;
        user.hashed_password = undefined;
        res.json({
            user
        });
    });
};

// using async/await
// exports.signup = async (req, res) => {
//     try {
//         const user = await new User(req.body);
//         console.log(req.body);

//         await user.save((err, user) => {
//             if (err) {
//                 // return res.status(400).json({ err });
//                 return res.status(400).json({
//                     error: 'Email is taken'
//                 });
//             }
//             res.status(200).json({ user });
//         });
//     } catch (err) {
//         console.error(err.message);
//     }
// };

exports.signin = (req, res) => {
    // find the user based on email
    const { email, password } = req.body;
    User.findOne({ email }, (err, user) => {
        if (err || !user) {
            return res.status(400).json({
                error: 'User with that email does not exist. Please signup'
            });
        }
        // if user is found make sure the email and password match
        // create authenticate method in user model
        if (!user.authenticate(password)) {
            return res.status(401).json({
                error: 'Email and password dont match'
            });
        }
        // generate a signed token with user id and secret
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
        // persist the token as 't' in cookie with expiry date
        res.cookie('t', token, { expire: new Date() + 9999 });
        // return response with user and token to frontend client
        const { _id, name, email, role , app} = user;
        user.token=token;
        user.save()
        return res.json({ token, user: { _id, email, name, role ,app} });
    });
};

exports.signout = (req, res) => {
    req.user.update({$unset : {token :1}},function(err,user){
        if(err) return err;
    })
    res.clearCookie('t');
    res.json({ message: 'Signout success' });
};

exports.requireSignin = expressJwt({
    secret: process.env.JWT_SECRET,
    userProperty: 'auth'
});

exports.isAuth = (req, res, next) => {
    let user = req.profile && req.auth && req.profile._id == req.auth._id;
    if (!user) {
        return res.status(403).json({
            error: 'Access denied'
        });
    }
    next();
};

exports.isAdmin = (req, res, next) => {
    if (req.profile.role === 0) {
        return res.status(403).json({
            error: 'Admin resourse! Access denied'
        });
    }
    next();
};

exports.findByToken=function(token,cb){
    var user=this;

    jwt.verify(token,confiq.SECRET,function(err,decode){
        user.findOne({"_id": decode, "token":token},function(err,user){
            if(err) return cb(err);
            cb(null,user);
        })
    })
};

exports.resetPassword = (req, res) => {
    if(!req.user) return res.status(400).json({error:"User not found"});
    if(!req.body.old_password) return res.status(400).json({error:"Old password is required"});
    if(!req.body.new_password) return res.status(400).json({error:"New password is required"});
    const { old_password, new_password } = req.body;
    User.findOne({ _id: req.user._id }, (err, user) => {
        if (err || !user) {
            return res.status(400).json({
                error: 'User with that email does not exist. Please signup'
            });
        }
        // if user is found make sure the email and password match
        // create authenticate method in user model
        if (!user.authenticate(old_password)) {
            return res.status(401).json({
                error: 'Old password is incorrect'
            });
        }
        user.password = new_password;
        user.save((err, user) => {
            if (err) {
                return res.status(400).json({
                    error: 'Password reset failed'
                });
            }
            user.salt = undefined;
            user.hashed_password = undefined;
            res.json({
                user
            });
        });
    });
};

/**
 * google login full
 * https://www.udemy.com/instructor/communication/qa/7520556/detail/
 */
