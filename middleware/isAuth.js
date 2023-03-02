const userModel = require('../model/user');
const jwt = require('jsonwebtoken');
const isAuthenticated = async (req,res,next)=>{
    try {
      
        const authHeader = req.headers.authorization;

        if (authHeader) {
            const token = authHeader.split(' ')[1];
            console.log(token);

        if(!token){
            return res.status(400).json({message:"Token not found"});
        }
        const verify =  jwt.verify(token,process.env.JWT_SECRET);
        req.user = await userModel.findById(verify._id);
        if(req.user.token !== token){
            return res.status(400).json({message:"Wrong credentials"});
        }
        console.log(req.user);
        next();
    }else{
        return res.status(400).json({message:"Token not found"});
    }
    } catch (error) {
       return res.status(500).json({message:error.message}); 
    }
}

module.exports = isAuthenticated;