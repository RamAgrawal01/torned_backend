const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/User");


//auth
exports.auth = async(req,res,next)=>{
    try{
        console.log("Hello");
        let token = null;
        if (req.cookies.token) token = req.cookies.token;
        else if (req.body.token) token = req.body.token;
        else if (req.header("Authorization")) token = req.header("Authorization").replace("Bearer ","");

        if(!token){
            return res.status(401).json({
                success : false ,
                message : "Missing token",
            });
        }

        try{
            const decode = jwt.verify(token , process.env.JWT_SECRET);
            console.log(decode);
            req.user = decode;
        }
        catch(e){
            return res.status(401).json({
                success : false,
                message : "Invalid Token",
            })
        }
        next();
    }
    catch(err){
        return res.status(401).json({
            success :false ,
            message : `Cannot verify -- ${err}`
        });
    }
}



//isStudent
exports.isStudent = async(req,res,next)=>{
    try{
        if(req.user.accountType !== "Student"){
            return res.status(401).json({
                success : false ,
                message : 'This is protected route for Students Only'
            });
        }
        next();
    }
    catch(err){
        return res.status(500).json({
            success : false ,
            message :  `Cannot be verified --> ${err}`
        })
    }
}

//isInstructor
exports.isInstructor = async(req,res,next)=>{
    try{
        if(req.user.accountType !== "Instructor"){
            return res.status(401).json({
                success : false ,
                message : 'This is protected route for Instructor Only'
            });
        }
        next();
    }
    catch(err){
        return res.status(500).json({
            success : false ,
            message :  `Cannot be verified --> ${err}`
        })
    }
}

//Admin
exports.isAdmin = async(req,res,next)=>{
    try{
        if(req.user.accountType !== "Admin"){
            return res.status(401).json({
                success : false ,
                message : 'This is protected route for Admin Only'
            });
        }
        next();
    }
    catch(err){
        return res.status(500).json({
            success : false ,
            message :  `Cannot be verified --> ${err}`
        })
    }
}