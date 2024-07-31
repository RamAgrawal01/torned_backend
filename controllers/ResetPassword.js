const { response } = require("express");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

//resetPasswordTOken
exports.resetPasswordToken = async(req,res) => {
   try{
     //get email from req body
     const email = req.body.email;
     console.log("reset password token email: ",email);
     //check user for this email , email validation
     const user = await User.findOne({email:email});
        
     if(!user){
         return res.status(401).json({
             success : false ,
             message : "Your email not registered",
         })
     }
     //token generator
     const token = crypto.randomUUID();
     //update user by adding token and expiration time
     const updatedDetail = await User.findOneAndUpdate(
         {email:email},
         {
             token : token,
             resetPasswordExpires : Date.now() + 6*60*1000,
         },
         {new:true}
     );
     //create url
         const url = `http://localhost:3000/update-password/${token}`
     //send mail containing url
     await mailSender(email,"Password Reset Link"
          , `Password Reset Link : ${url}`);
     //return response
     return res.status(200).json({
         success : true,
         message : "Email send Successfully , Check your mail"
     })
   }

catch(err){
    return res.status(500).json({
        success : false ,
        message : `Something went wronf --> ${err}`
    })
}



}


//reset pAssword
exports.resetPassword = async(req,res) => {
  
    try{
          //data fetch (fronthend token ko body me dal dega)
          const token = req.body?.token || req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');

         const {password , confirmPassword } = req.body;
    //validation
    if (!token || !password || !confirmPassword) {
        return res.status(401).json({
            success: false,
            message: "All fiels are required...!"
        });
    }
        // validate both passwords
        if (password !== confirmPassword) {
            return res.status(401).json({
                success: false,
                message: 'Passowrds are not matched'
            });
        }
    //getUserDetails from db using token
    const userDetails = await User.findOne({token:token});
    //if no entry--> Invalid entry
    if(token!== userDetails.token){
        return res.json({
            success : false ,
            message : "Token invalid",
        })
    }
    //token time change
    if(userDetails.resetPasswordExpires < Date.now()) {
        return res.json({
            success : false ,
            message : "Token Expired"
        });
    }
    //hash password
    const hashedPassword = await bcrypt.hash(password,10);
    //update kardo
    await User.findOneAndUpdate({token:token},
        {password:hashedPassword},
        {new:true},
    );
    //response return kar do
    return res.status(200).json({
        success : true ,
        message : "Password reset Successfull"
    })
    }

    catch(err){
        console.log(err)
        return res.json({
            success : false ,
            message : `Erroe while Reset password --> ${err}`
        })
    }
}