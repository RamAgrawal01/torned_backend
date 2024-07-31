const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");

const OTPSChema = new mongoose.Schema({
    email : {
        type : String,
        required : true ,
    },
    otp:{
        type : String,
        required : true ,
    },
    createdAt: {
        type: Date,
        default: () => new Date(),
        expires: 5 * 60, // TTL in seconds (5 minutes)
    }
});

//function to send email with otp

async function sendVerificationEmail (email , otp) {
    try{
        const mailResponse = await mailSender(email , "Verification Mail for Torned Education" , otp);
        console.log("Email Sent Successfully" , mailResponse);

    }catch(err){
        console.log(`Error occured while sending mails : ${err}`);
        throw err;
    }
}

OTPSChema.pre("save",async function(next){
    await sendVerificationEmail(this.email , this.otp);
    next();
})

module.exports = mongoose.model("OTP",OTPSChema);