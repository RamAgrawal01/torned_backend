//signup ke time par nakli profile create ki thi
const Profile = require("../models/Profile");
const User = require("../models/User");
const Course = require("../models/Course");
const {convertSecondsToDuration} = require("../utils/secToDuration")
const CourseProgress = require("../models/CourseProgress")
const {uploadImageCloudinary , deleteResourceFromCloudinary} = require("../utils/imageUploader");

require("dotenv").config();

//UPDATE THE PROFILE
exports.updateProfile = async(req,res) => {
    try{
        //get data//get user id
        const{dateOfBirth="" , about="" ,gender="" ,firstName , lastName,contactNumber, schoolName="" , address="" } = req.body;
        // {middle wair payload se dal di}
        const id = req.user.id;
     
        //finding the profile
        const userDetails = await User.findById(id);
        const profileId = userDetails.additionalDetails;
        const profileDetails = await Profile.findById(profileId);
        //update profile
        if (firstName) {
            userDetails.firstName = firstName;
        }
        if (lastName) {
            userDetails.lastName = lastName;
        }
        if(contactNumber){
            userDetails.contactNumber=contactNumber;
        }
        await userDetails.save();

        profileDetails.dateOfBirth = dateOfBirth;
        profileDetails.about = about;
        profileDetails.gender = gender;
        profileDetails.address = address;
        profileDetails.schoolName = schoolName;
        await profileDetails.save();

        const updatedUserDetails = await User.findById(id)
            .populate({
                path: 'additionalDetails'
            })
            
        // console.log('updatedUserDetails -> ', updatedUserDetails);

        // return response
       return res.status(200).json({
            success: true,
            updatedUserDetails,
            message: 'Profile updated successfully'
        });

    }
    catch(err){ 
        return res.status(500).json({
            success : false ,
            error : err.message,
        });
    }
}

//ACcount DELETATION
exports.deleteAccount = async (req, res) => {
    try {
        const id = req.user.id;

        // Validate user existence
        const userDetails = await User.findById(id);
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Delete user's profile picture from Cloudinary
        await deleteResourceFromCloudinary(userDetails.image);

        // Handle enrolled courses if any
        const userEnrolledCoursesId = userDetails.courses;
        for (const courseId of userEnrolledCoursesId) {
            await Course.findByIdAndUpdate(courseId, {
                $pull: { studentsEnrolled: id }
            });
        }

        //

        // Delete user's profile details
        await Profile.findByIdAndDelete(userDetails.additionalDetails);

        // Delete user account
        await User.findByIdAndDelete(id);

        // Return success response
        return res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });
    } catch (error) {
        // Handle errors
        return res.status(500).json({
            success: false,
            error: error.message,
            message: "Account cannot be deleted"
        });
    }
};


//////////////////GET DETAILS OF USER ///////////////////
exports.getUserDetails = async(req,res) =>{
    try{
        const id = req.user.id;
        const userDetails = await User.findById(id).populate("additionalDetails").exec();

        //return response
        return res.status(200).json({
            success : true ,
            data : userDetails,
            message : "User Data fetched successfully",
        });
    }
    catch (error) {
        console.log('Error while fetching user details');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while fetching user details'
        })
    }  
}
//////////////update user profile page////////////
exports.updateUserProfileImage = async (req, res) => {
    try {
        const profileImage = req.files?.profileImage;
        const userId = req.user.id;
        console.log("ABCD")
        // validation
        // console.log('profileImage = ', profileImage)

        // upload imga eto cloudinary
        const image = await uploadImageCloudinary(profileImage,
            process.env.FOLDER_NAME, 1000, 1000);

        // console.log('image url - ', image);
        const userDetails = await User.findById(userId);
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Delete user's profile picture from Cloudinary
        await deleteResourceFromCloudinary(userDetails.image);

        // update in DB 
        const updatedUserDetails = await User.findByIdAndUpdate(userId,
            { image: image.secure_url },
            { new: true }
        )
            .populate({
                path: 'additionalDetails'

            })

        // success response
        res.status(200).json({
            success: true,
            message: `Image Updated successfully`,
            data: updatedUserDetails,
        })
    }
    catch (error) {
        console.log('Error while updating user profile image');
        console.log(error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while updating user profile image',
        })
    }
}
// **********DELETE USER PROFILE PICTURE*************//
exports.deleteUserProfileImage = async (req, res) => {
    try {
        const id = req.user.id;  // Assuming the user ID is passed in the URL parameters

        const userDetails = await User.findById(id);
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Delete user's profile picture from Cloudinary if it exists
        if (userDetails.image) {
            await deleteResourceFromCloudinary(userDetails.image);
        }

        // Update user document to remove the image reference
        userDetails.image = `https://api.dicebear.com/5.x/initials/svg?seed=${userDetails.firstName}%20${userDetails.lastName}`;
        await userDetails.save();

        return res.status(200).json({
            success: true,
            message: "Profile image deleted successfully",
            data: userDetails // Send updated userDetails back if needed
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while deleting the profile image",
        });
    }
};


// ************GET ENROLLED COURSES*****************//
exports.getEnrolledCourses = async(req,res) => {
    try{
        const userId = req.user.id
        let userDetails = await User.findOne({ _id: userId, })
            .populate({
                path: "courses",
                populate: {
                    path: "courseContent",
                    populate: {
                        path: "subSection",
                    },
                },
            })
            .exec()

             userDetails = userDetails.toObject()

        var SubsectionLength = 0
        for (var i = 0; i < userDetails.courses.length; i++) {
            let totalDurationInSeconds = 0
            SubsectionLength = 0
            for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
                totalDurationInSeconds += userDetails.courses[i].courseContent[
                    j
                ].subSection.reduce((acc, curr) => acc + parseInt(curr.timeDuration), 0)

                userDetails.courses[i].totalDuration = convertSecondsToDuration(totalDurationInSeconds)
                SubsectionLength += userDetails.courses[i].courseContent[j].subSection.length
            }

            let courseProgressCount = await CourseProgress.findOne({
                courseID: userDetails.courses[i]._id,
                userId: userId,
            })

            courseProgressCount = courseProgressCount?.completedVideos.length

            if (SubsectionLength === 0) {
                userDetails.courses[i].progressPercentage = 100
            } else {
                // To make it up to 2 decimal point
                const multiplier = Math.pow(10, 2)
                userDetails.courses[i].progressPercentage =
                    Math.round((courseProgressCount / SubsectionLength) * 100 * multiplier) / multiplier
            }
        }

        if(!userDetails) {
            return res.status(400).json({
                success : false,
                message :`Could not user with id : ${userDetails}`
            })
        }

        return res.status(200).json({
            success : true ,
            data: userDetails.courses,
        })
    }
    catch(err) {
        return res.status(500).json({
            success : false ,
            message : err.message,
        })
    }
};

//***********Instructor Dashboard ****************** *
exports.instructorDashboard = async (req, res) => {
    try {
        const courseDetails = await Course.find({ instructor: req.user.id })
            .populate({
                path: "studentsEnrolled",
                select: "firstName lastName email image",
            })
            .populate({
                path : "ratingAndReviews",
                populate:{
                    path:"user",
                    select:"firstName  lastName email image ",
                }
            })
            .populate({
                path: "courseContent",
                populate: {
                    path: "subSection",
                },
            });

        const courseData = await Promise.all(courseDetails.map(async (course) => {
            const courseAmount = course.price;
            const totalStudentsEnrolled = course.studentsEnrolled.length;
            const totalAmountGenerated = totalStudentsEnrolled * course.price;


            // Calculate the average rating
            const ratings = course.ratingAndReviews.map(review => review.rating);
            const averageRating = ratings.length > 0 ? ratings.reduce((acc, rating) => acc + rating, 0) / ratings.length : 0;

            // Get all reviews
            const allReviews = course.ratingAndReviews.map(review => ({
                user: review.user,
                rating: review.rating,
                review: review.review,
            }));

            // Get enrolled students with progress
            const EnrollStudents = await Promise.all(course.studentsEnrolled.map(async (student) => {
                let totalDurationInSeconds = 0;
                let SubsectionLength = 0;

                for (let section of course.courseContent) {
                    totalDurationInSeconds += section.subSection.reduce((acc, curr) => acc + parseInt(curr.timeDuration), 0);
                    SubsectionLength += section.subSection.length;
                }

                const courseProgress = await CourseProgress.findOne({
                    courseID: course._id,
                    userId: student._id,
                });

                const completedVideosCount = courseProgress ? courseProgress.completedVideos.length : 0;
                const progressPercentage = SubsectionLength === 0 ? 100 : (completedVideosCount / SubsectionLength) * 100;

                return {
                    firstName: student.firstName,
                    lastName: student.lastName,
                    email: student.email,
                    image: student.image,
                    additionalDetails : student.populate({
                        path:"additionalDetails",
                        select:"about"
                    }),
                    progressPercentage: Math.round(progressPercentage * 100) / 100, // rounding to 2 decimal places
                };
            }));

            // Create a new object with the additional fields
            const courseDetailsWithStats = {
                _id: course._id,
                courseName: course.courseName,
                courseDescription: course.courseDescription,
                courseAmount,
                courseThumbnail: course.thumbnail,
                totalStudentsEnrolled,
                totalAmountGenerated,
                averageRating,
                allReviews,
                EnrollStudents,
            };

            return courseDetailsWithStats;
        }));

        return res.status(200).json({
                success : true,
                message : "Instructor dashboard fetch success",
                courses: courseData });
                
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};
