const Course = require("../models/Course");
const RatingAndReviews = require("../models/RatingAndReviews");
const Cetegory = require("../models/Category");
const User = require("../models/User");
const Section = require("../models/Section")
const SubSection = require('../models/SubSection')
const {convertSecondsToDuration} = require("../utils/secToDuration")
const CourseProgress = require("../models/CourseProgress");

const {uploadImageCloudinary , deleteResourceFromCloudinary} = require("../utils/imageUploader");
require("dotenv").config();

//CREATE COURSE HANDLER FUNCTION
exports.createCourse = async (req, res) => {
    try {
        // extract data
        let { courseName, courseDescription, whatYouWillLearn, price, category, instructions: _instructions, status, tag: _tag } = req.body;

        // Convert the tag and instructions from stringified Array to Array
        const tag = JSON.parse(_tag)
        const instructions = JSON.parse(_instructions)



      
        const thumbnail = req.files?.thumbnailImage;
        // console.log("Thumbnail Image: ",thumbnail);

        // validation
        if (!courseName || !courseDescription || !whatYouWillLearn || !price
            || !category || !thumbnail || !instructions.length || !tag.length) {

                console.log("courseName : ",courseName)
                console.log("courseDescription : ",courseDescription)
                console.log("whatYouWillLearn: ",whatYouWillLearn)
                console.log("price : ",price)
                console.log("category : ",category)
                console.log("thumbnail : ",thumbnail)
                console.log("tag : ",tag)
                console.log("instructions : ",instructions)
             
            return res.status(400).json({
                success: false,
                message: 'All Fileds are required'
            });
        }

        if (!status || status === undefined) {
            status = "Draft";
        }

        // check current user is instructor or not , bcoz only instructor can create 
        // we have insert user id in req.user , (payload , while auth ) 
        const instructorId = req.user.id;


        // check given category is valid or not
        const categoryDetails = await Cetegory.findById(category);
        if (!categoryDetails) {
            return res.status(401).json({
                success: false,
                message: 'Category Details not found'
            })
        }


        // upload thumbnail to cloudinary
        const thumbnailDetails = await uploadImageCloudinary(thumbnail, process.env.FOLDER_NAME);

        // create new course - entry in DB
        const newCourse = await Course.create({
            courseName, courseDescription, instructor: instructorId, whatYouWillLearn, price, category: categoryDetails._id,
            tag, status, instructions, thumbnail: thumbnailDetails.secure_url, createdAt: Date.now(),
        });

        // add course id to instructor courses list, this is bcoz - it will show all created courses by instructor 
        await User.findByIdAndUpdate(instructorId,
            {
                $push: {
                    courses: newCourse._id
                }
            },
            { new: true }
        );


        // Add the new course to the Categories
        await Cetegory.findByIdAndUpdate(
            { _id: category },
            {
                $push: {
                    courses: newCourse._id,
                },
            },
            { new: true }
        );

        // return response
        res.status(200).json({
            success: true,
            data: newCourse,
            message: 'New Course created successfully'
        })
    }

    catch (error) {
        console.log('Error while creating new course');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while creating new course'
        })
    }
}



//GET ALL COURSES HANDLER FUNCTION
exports.showAllCourses = async(req,res) =>  {
    try {
        const allCourses = await Course.find({},
            {
                courseName: true, courseDescription: true, price: true, thumbnail: true, instructor: true,
                ratingAndReviews: true, studentsEnrolled: true
            })
            .populate({
                path: 'instructor',
                select: 'firstName lastName email image'
            })
            .exec();

        return res.status(200).json({
            success: true,
            data: allCourses,
            message: 'Data for all courses fetched successfully'
        });
    }

    catch (error) {
        console.log('Error while fetching data of all courses');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while fetching data of all courses'
        })
    }
}


///////GET COURSE DETAIl//////
exports.getCourseDetails = async (req, res) => {
    try {
        // get course ID
        const { courseId } = req.body;

        // find course details
        const courseDetails = await Course.findOne({
            _id: courseId,
        })
            .populate({
                path: "instructor",
                populate: {
                    path: "additionalDetails",
                },
            })
            .populate("category")
            .populate("ratingAndReviews")

            .populate({
                path: "courseContent",
                populate: {
                    path: "subSection",
                    select: "-videoUrl",
                },
            })
            .exec()


        //validation
        if (!courseDetails) {
            return res.status(400).json({
                success: false,
                message: `Could not find the course with ${courseId}`,
            });
        }

        // if (courseDetails.status === "Draft") {
        //   return res.status(403).json({
        //     success: false,
        //     message: `Accessing a draft course is forbidden`,
        //   });
        // }

        // console.log('courseDetails -> ', courseDetails)
        let totalDurationInSeconds = 0
        courseDetails.courseContent.forEach((content) => {
            content.subSection.forEach((subSection) => {
                const timeDurationInSeconds = parseInt(subSection.timeDuration)
                totalDurationInSeconds += timeDurationInSeconds
            })
        })

        const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

        //return response
        return res.status(200).json({
            success: true,
            data: {
                courseDetails,
                totalDuration,
            },
            message: 'Fetched course data successfully'
        })
    }

    catch (error) {
        console.log('Error while fetching course details');
        console.log(error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while fetching course details',
        });
    }
}
//***********EDIT COURSE DETAILS********** */
exports.editCourse = async(req,res) => {
    try{
        const {courseId} = req.body
        const updates = req.body
        const course = await Course.findById(courseId)

        if(!course) {
            return res.status(401).json({
                success:false,
                error: "course not found"
            })
        }

        //if thumbnail image is not found 
        if(req.files){

             // Delete user's profile picture from Cloudinary
        await deleteResourceFromCloudinary(course.thumbnail);


            const thumbnail = req.files.thumbnailImage
            const thumbnailImage = await uploadImageCloudinary(
                thumbnail , process.env.FOLDER_NAME
            )
            course.thumbnail = thumbnailImage.secure_url
        }
        //update only those fields that are present in request body
        for(const key in updates){
            if(updates.hasOwnProperty(key)){
                if(key=='tag' || key==="instructions"){
                    course[key] = JSON.parse(updates[key])
                }
                else{
                    course[key] = updates[key]
                }
            }
        }

        //updatedAt
        course.updatedAt = Date.now();
        //save data
        await course.save()

        const updateCourse = await Course.findOne({
            _id: courseId,
        })
        .populate({
            path: "instructor",
            populate: {
                path: "additionalDetails",
            },
        })
        .populate("category")
        .populate("ratingAndReviews")
        .populate({
            path: "courseContent",
            populate: {
                path: "subSection"
            },
        }).exec();

            //success Response 
            res.status(200).json({
                success : true ,
                message : "Course updated suceessfully",
                data : updateCourse
            })
    }
    catch (error) {
        console.error(error)
        res.status(500).json({
            success: false,
            message: "Error while updating course",
            error: error.message,
        })
    }
}

// *******GET INSTRUCTOR COURSES *********//
exports.getInstructorCourses = async(req, res) => {
    try{
        const instructorId = req.user.id
        //find all the courses belong to particular instructor and arrange in decreasing order
        const instructorCourses = await Course.find({instructor:instructorId}).sort({created: -1})

        //return the instructor courses
        res.status(200).json({
            success : true,
            data: instructorCourses,
            message:"course made by instructor fetched successfully"
        })
        
    }
    catch (error) {
        console.error(error)
        res.status(500).json({
            success: false,
            message: "Failed to retrieve instructor courses",
            error: error.message,
        })
    }

}

// ================ Delete the Course ================
exports.deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id;

        // Find the course
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Unenroll students from the course
        const studentsEnrolled = course.studentsEnrolled;
        for (const studentId of studentsEnrolled) {
            await User.findByIdAndUpdate(studentId, {
                $pull: { courses: courseId },
            });
        }

        // Delete course thumbnail from Cloudinary
        await deleteResourceFromCloudinary(course?.thumbnail);

        // Delete sections and sub-sections
        const courseSections = course.courseContent;
        for (const sectionId of courseSections) {
            // Delete sub-sections of the section
            const section = await Section.findById(sectionId);
            if (section) {
                const subSections = section.subSection;
                for (const subSectionId of subSections) {
                    const subSection = await SubSection.findById(subSectionId);
                    if (subSection) {
                        await deleteResourceFromCloudinary(subSection.videoUrl); // delete course videos from Cloudinary
                    }
                    await SubSection.findByIdAndDelete(subSectionId);
                }
            }

            // Delete the section
            await Section.findByIdAndDelete(sectionId);
        }

        // Delete course reference from user's courses list
        await User.findByIdAndUpdate(userId, {
            $pull: { courses: courseId },
        });

        // Delete the course
        await Course.findByIdAndDelete(courseId);

        return res.status(200).json({
            success: true,
            message: "Course deleted successfully",
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Error while deleting course",
            error: error.message,
        });
    }
};

//**************Get FUll course Details */
exports.getFullCourseDetails = async(req,res) => {
    try{
        const {courseId} = req.body
        const userId = req.user.id
        
        const courseDetails = await Course.findOne({
            _id:courseId,
        })
        .populate({
            path:"instructor",
            populate:{
                path:"additionalDetails",
            },
        })
        .populate("category")
        .populate("ratingAndReviews")
        .populate({
            path:"courseContent",
            populate:{
                path:"subSection",
            },
        })
        .exec()

        let courseProgressCount = await CourseProgress.findOne({
            courseID : courseId,
            userId : userId,
        })

        if(!courseDetails){
            return res.status(404).json({
                success : false,
                message :  `Could not find course with id : ${courseId}`
            })
        }

        let totalDurationInSeconds = 0
        courseDetails.courseContent.forEach((content)=>{
            content.subSection.forEach((subSection)=>{
                const timeDurationInSeconds = parseInt(subSection.timeDuration)
                totalDurationInSeconds += timeDurationInSeconds
            })
        })

        const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

        return res.status(200).json({
            success : true ,
            data:{
                courseDetails,
                totalDuration,
                completedVideos: courseProgressCount?.completedVideos ? courseProgressCount?.completedVideos : [],
                
            }
        })
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        })
    }
}
