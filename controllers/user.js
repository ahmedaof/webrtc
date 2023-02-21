const User = require('../model/user');
exports.getAllUser = (req, res) => {
  // get all user from mongodb
    User.find({app:req.user.app}).exec((err, users) => {
        if (err) {
            return res.status(400).json({
                error: 'No users found'
            });
        }
       res.status(200).json({users});
    })
  
};



/**
 * google login full
 * https://www.udemy.com/instructor/communication/qa/7520556/detail/
 */
