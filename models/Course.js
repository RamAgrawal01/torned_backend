const mongoose = require("mongoose");

 const courseSchema = new mongoose.Schema({

    courseName : {
        type: String,
        trim : true,
        required : true ,
    },
    courseDescription : {
        type : String,
        required : true ,
    },
    instructor : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true,
    },
    whatYouWillLearn : {
        type : String ,
    },
    courseContent : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref: "Section",
        }
    ],
    ratingAndReviews : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "RatingAndReviews",
        }
    ],
    price : {
        type : Number,
        required : true ,
    },
    thumbnail : {
        type : String,
    },
    tag:{
        type : [String],
        required : true,
    },

    category : {
        type : mongoose.Schema.Types.ObjectId,
        ref: "Category",
    },
    studentsEnrolled : [

        {
            type : mongoose.Schema.Types.ObjectId,
            required : true,
            ref : "User",
        }
       
    ],
    instructions:{
        type : [String],
    },
    status:{
        type : String,
        enum : ["Draft" , "Published"],
        
    },
    createdAt: {
        type: Date,
    }
    ,
    updatedAt: {
        type: Date,
    }

 });
 module.exports = mongoose.model("Course" , courseSchema);