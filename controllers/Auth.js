const User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const Profile = require("../models/Profile");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const cookie = require('cookie');
require("dotenv").config();
const {passwordUpdated} = require("../mail/templates/passwordUpdate");
const mailSender = require("../utils/mailSender");
const otpTemplate = require("../mail/templates/emailVerificationTemplate")

                             //SEND OTP CONTROLLER
exports.sendOTP = async(req,res) => {
    try{
        const {email} = req.body;

        //check if user already exist or not
        const checkUserExist = await User.findOne({email});

         //if user already exist , then return response
         if(checkUserExist) {
            console.log('(when otp generate) User alreay registered')
        return res.status(401).json({
            success : false,
            message : "User already Registered , please Signup",
        })
    }
        //if user do not exist , then we generate the OTP
        const otp = otpGenerator.generate(6,{
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false,
        });
        console.log("OTP generated: ",otp);

        //chekc otp unique or not
        let result = await OTP.findOne({otp:otp});
        while(result){
            otp = otpGenerator.generate(6,{
                upperCaseAlphabets:false,
                lowerCaseAlphabets:false,
                specialChars:false,
            });
            result = await OTP.findOne({otp:otp});
        }

        //send otp in mail
        await mailSender(email ,'OTP Verfication Email' , otpTemplate(otp,result));

        //OTP entry in database
        const otpPayload = {email,otp};

        const otpBody = await OTP.create(otpPayload);
        console.log(otpBody);


        res.status(200).json({
            success:true,
            message : `OTP Sent Successfully`,
            otp,
        })



    }catch(err){
        console.log(err);
        return res.status(500).json({
            success : false,
            message : err.message
        })
    }

}

                       //**********SIGNUP SIGNUP******************** */
                       exports.signUp = async (req, res) => {
                        try {
                            const {
                                firstName, lastName,
                                email, password, confirmPassword,
                                accountType, otp, contactNumber,
                            } = req.body;
                            console.log("Full request body: ",req.body)
                    
                            // Validate required fields
                            if (!firstName || !lastName || !email || !password || !confirmPassword || !otp || !contactNumber) {
                                console.log("Received data:");
                                console.log("Account Type:", accountType);
                                console.log("Contact Number:", contactNumber);
                                console.log("First Name:", firstName);
                                console.log("Last Name:", lastName);
                                console.log("Email:", email);
                                console.log("Password:", password);
                                console.log("Confirm Password:", confirmPassword);
                                console.log("OTP:", otp);
                                return res.status(403).json({
                                    success: false,
                                    message: `All fields are required`,
                                });
                            }
                    
                            // Validate password match
                            if (password !== confirmPassword) {
                                console.log("password: ",password);
                                console.log("confirmPassword: ",confirmPassword);
                                return res.status(400).json({
                                    success: false,
                                    message: "Passwords do not match",
                                });
                            }
                    
                            // Check if user already exists
                            const existingUser = await User.findOne({ email });
                            if (existingUser) {
                                return res.status(400).json({
                                    success: false,
                                    message: "User is already registered with this email",
                                });
                            }
                    
                            // Find most recent OTP stored for user
                            const recentOTP = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
                    
                            // Validate OTP
                            if (recentOTP.length === 0) {
                                return res.status(400).json({
                                    success: false,
                                    message: "OTP not found",
                                });
                            } else if (otp !== recentOTP[0].otp) {
                                console.log("otp: ",otp)
                                console.log("recent otp: ",recentOTP[0].otp)
                                return res.status(400).json({
                                    success: false,
                                    message: "Invalid OTP",
                                });
                            }
                    
                            // Hash the password
                            const hashedPassword = await bcrypt.hash(password, 10);
                    
                            // Create profile details
                            const profileDetails = await Profile.create({
                                gender: null,
                                dateOfBirth: null,
                                about: null,
                                address: null,
                                schoolName: null,
                            });
                            let approved = "";
                            approved === "Instructor" ? (approved = false) : (approved = true);
                    
                            // Create user
                            const user = await User.create({
                                firstName,
                                lastName,
                                email,
                                contactNumber,
                                password: hashedPassword,
                                accountType,
                                additionalDetails: profileDetails._id,
                                approved : approved,
                                image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName}%20${lastName}`,
                            });
                    
                            // Return success response
                            return res.status(200).json({
                                success: true,
                                message: "User registered successfully",
                                user,
                            });
                        } catch (error) {
                            console.error(error);
                            return res.status(500).json({
                                success: false,
                                message: `User registration failed due to ${error}`,
                            });
                        }
                    };
                    

                //**********LOGIN LOGIN LOGIN*******************
exports.login = async (req,res) => {
    try{
        //get data from the req body 
        const {email , password } = req.body;
        //validation data 
        if(!email || !password) {
            return res.status(403).json({
                success : false ,
                message : "Please fill all the details"
            });
        }
        //user exist or not 
        const user = await User.findOne({email}).populate("additionalDetails");

        if(!user){
            return res.status(401).json({
                success : false,
                message : "User is not registered , go to Signup"
            });
        }
        //Generate Token , after password matching
        if(await bcrypt.compare(password , user.password)){

            const payload = {
                email : user.email,
                id : user._id,
                accountType : user.accountType,
            }

            const token = jwt.sign(payload, process.env.JWT_SECRET,{
                expiresIn:"3h",
            });
            user.token = token;
            user.password = undefined;
        
            
        
        //create cookie and send response
        const options = {
            expires : new Date(Date.now() + 3*24*60*60*1000),
            httpOnly : true,
        }

        res.cookie("token" , token , options).status(200).json({
            success : true , 
            token , 
            user ,
            message : "Logged in Success",
        })
    }
    else{
        return res.status(401).json({
            success : false,
            message : "Invalid Password !"
        })
    }
  
        

    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            success : false ,
            message : `Cannot login due to  ${err}`
        })
    }
}
////////CHANGE PASSWORD///////////////
exports.changePassword = async(req, res) => {
  
    try {
        // Extract data
        const { oldPassword, newPassword, confirmPassword } = req.body;

        // Validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(403).json({
                success: false,
                message: "All fields are required",
            });
        }
   

        // Get user details
        const userDetails = await User.findById(req.user.id);

        // Validate old password entered correct or not
        const isPasswordMatch = await bcrypt.compare(oldPassword, userDetails.password);

        // If old password does not match
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Old password is incorrect"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in DB
        const updatedUserDetails = await User.findByIdAndUpdate(
            req.user.id,
            { password: hashedPassword },
            { new: true }
        );
        console.log("Updated user details: ",updatedUserDetails);

        // Send email notification
        try {
            const emailResponse = await mailSender(
                updatedUserDetails.email,
                `Password for your account has been updated`,
                passwordUpdated(
                    updatedUserDetails.email,
                    `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
                )
            );
            // console.log("Email send success : ", emailResponse);
        } catch (err) {
            console.error("Error occurred while sending email: ", err);
            return res.status(500).json({
                success: false,
                message: "Error occurred while sending email",
                error: err.message,
            });
        }

        // Return success response
        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        console.error('Error while changing password:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while changing password'
        });
    }
};
