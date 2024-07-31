const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
    
    gender : {
        type : String,
        trim:true,
    },
    dateOfBirth : {
        type : String,
        trim:true,
    },
    about : {
        type : String,
        trim : true ,
    },
    address:{
        type:String,
        trim : true,
    },
    schoolName : {
        type:String,
        trim:true,
    }
   


});
module.exports = mongoose.model("Profile",profileSchema);

