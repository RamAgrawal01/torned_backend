const CourseProgress = require("../models/CourseProgress");
const SubSection = require("../models/SubSection");


exports.updateCourseProgress = async(req,res)=>{
    const {courseId  , subSectionId} = req.body;
    const userId = req.user.id;

    try{
        //check if the subsection is valid or not
        const subSection = await SubSection.findById(subSectionId);

        if(!subSection) {
            return res.status(404).json({
                success : false,
                message:"Invalid SubSection"
            })
        }
        //check for old entry
        let courseProgress = await CourseProgress.findOne({
            courseID : courseId,
            userId : userId
        });
        console.log("Course id , ",courseId)
        console.log("User id: ",userId)
        if(!courseProgress) {
            return res.status(404).json({
                success : false ,
                message : "Course Progress does not exist"
            })
        }
        else{
            //check for re-completing video 
            if(courseProgress.completedVideos.includes(subSectionId)){
                return res.status(400).json({
                    success : false ,
                    message : "Video already completed"
                })
            }
            //push the video in complted video
            courseProgress.completedVideos.push(subSectionId);
        }
        await courseProgress.save()
        
            return res.status(200).json({ 
                success : true,
                message: "Course progress updated" })
                
        
       
        
    }
    catch(error) {
        console.error(error);
        return res.status(500).json({
            success : false,
            message : "Internal Server error"
        })
    }
}