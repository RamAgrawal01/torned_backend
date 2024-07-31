const RatingAndReviews = require("../models/RatingAndReviews");
const Course = require("../models/Course");

////////////CREATE RATING/////////////////
exports.createRating = async (req, res) => {
    try {
      // Get user id
      const userId = req.user.id;
  
      // Fetch data from body
      const { rating, review, courseId } = req.body;
  
      // Check if user is enrolled in the course
      const courseDetail = await Course.findOne({
        _id: courseId,
        studentsEnrolled: userId,
      });
  
      if (!courseDetail) {
        return res.status(404).json({
          success: false,
          message: 'Student is not enrolled in the course',
        });
      }
  
      // Check if user already reviewed the course
      const alreadyReviewed = await RatingAndReviews.findOne({
        user: userId,
        course: courseId,
      });
  
      if (alreadyReviewed) {
        return res.status(403).json({
          success: false,
          message: 'Course is already reviewed',
        });
      }
  
      // Create rating and review
      const ratingReview = await RatingAndReviews.create({
        rating,
        review,
        course: courseId,
        user: userId,
      });
  
      // Update course with this rating/review
      const updatedCourseDetails = await Course.findByIdAndUpdate(
        courseId,
        {
          $push: {
            ratingAndReviews: ratingReview._id,
          },
        },
        { new: true }
      );
  
      console.log('Updated Course Details:', updatedCourseDetails);
  
      // Return response
      return res.status(200).json({
        success: true,
        message: 'Rating and review success',
        ratingReview,
      });
    } catch (err) {
      console.error('Error:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
///////////////GET AVERAGE RATING///////////////
exports.getAverageRating = async(req,res) => {
    try{
        //get course id 
        const courseId = req.body.courseId;
        //calculatae average rating 
        const result = await RatingAndReviews.aggregate([
            {
                $match:{
                    course : new mongoose.Types.objectId(courseId),
                },
            },
            {
                $group:{
                    //null isliye diya taki sare gorups bana le 
                    _id:null,
                    averageRating:{$avg:"$rating"} ,
                }
            }
        ])
        //rturn reating 
        if(result.length>0) {
            return res.status(200).json({
                success : true ,
                averageRating : result[0].averageRating,
            })
        }
        return result.status(200).json({
            success : true ,
            message : "Average rating is 0",
            averageRating:0,
        })


    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success : false ,
            message : error.message,
        })
    }
}

//////////GET ALL THE RATING AND REVIEWS/////////////////////
exports.getAllRatingReview = async(req,res) => {
    try{
        const allReviews = await RatingAndReviews.find({}).sort({rating:"desc"})
                                        .populate({
                                            path:"user",
                                            select:'firstName lastName email image',
                                        })
                                        .populate({
                                            path: "course",
                                            select : "courseName",
                                        })
                                        .exec();
             return res.status(200).json({
                success : true ,
                message : "All Rating and Review fetch Successfully ",
                data : allReviews,
             })                           
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success : false ,
            message : error.message,
        })
    }
}