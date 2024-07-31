const SubSection = require("../models/SubSection");
const Section = require("../models/Section");
const {uploadImageCloudinary , deleteResourceFromCloudinary} = require("../utils/imageUploader")
require("dotenv").config();

//CREATE SUBSECTION
exports.createSubSection = async (req, res) => {
    try {
        // Fetch data from req body
        const { sectionId, title, description } = req.body;
        // Extract file/video
        const videoFile = req.files?.video;
        console.log("Subsection creating req body ; ",req.body);
        console.log("Vide0: ",videoFile);
        // Validation
        if (!sectionId || !title || !description || !videoFile) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }
        
        // Upload video to cloudinary
        const uploadDetails = await uploadImageCloudinary(videoFile, process.env.FOLDER_NAME);
        console.log("video details: ", uploadDetails);

        if (!uploadDetails || !uploadDetails.secure_url) {
            return res.status(500).json({
                success: false,
                message: "Failed to upload video",
            });
        }

        // Create a subsection 
        const subSectionDetails = await SubSection.create({
            title,
            timeDuration:uploadDetails.duration,
            description,
            videoUrl: uploadDetails.secure_url,
        });
        console.log("subsection details: ", subSectionDetails);
        console.log(sectionId)
        // Push into section with subsection id
        const sectionExists = await Section.findById({_id:sectionId});
        if (!sectionExists) {
            return res.status(404).json({
                success: false,
                message: "Section not found",
            });
        }

        // Push into section with subsection id
        const updatedSection = await Section.findByIdAndUpdate(
            sectionId,
            { $push: { subSection: subSectionDetails._id } },
            { new: true }
        ).populate("subSection").exec();

        console.log("updated Section: ", updatedSection);

        // Return response
        return res.status(200).json({
            success: true,
            message: "Sub-Section created successfully",
            data: updatedSection,
        });
    } catch (error) {
        console.log('Error while creating SubSection');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while creating SubSection'
        });
    }
};
//tOdo : update subsection 
exports.updateSubSection = async(req,res) => {
    try{
        const {sectionId , subSectionId , title , description } = req.body;
        //validation
        if(!subSectionId) {
            return res.status(400).json({
                status : false ,
                message : "subSection Id is not found"
            })
        }
        //find in DB
        const subSection = await SubSection.findById(subSectionId);
        if(!subSection) {
            return res.status(400).json({
                success : false ,
                message : "Subsection not found",
            })
        }
        //add the data 
        if(title) {
            subSection.title = title;
        }
        if(description) {
            subSection.description = description;
        }

        //upload video to cloudinary
        if(req.files && req.files.videoFile !== undefined){
            const video = req.files.videoFile;
            const subSectionDetails = await SubSection.findById(subSectionId);
            await deleteResourceFromCloudinary(subSectionDetails.videoUrl);
            const uploadDetails = await uploadImageCloudinary(video,process.env.FOLDER_NAME);
            subSection.videoUrl = uploadDetails.secure_url;
            subSection.timeDuration = uploadDetails.duration;
        }

        //save data to DB
        await subSection.save();

        const updatedSection = await Section.findById(sectionId).populate("subSection").exec();

        return res.json({
            success : true ,
            data : updatedSection,
            message : "subSection updated successfully",
        });
    }
    catch(err) {
        console.error("Error while updating the section");
        console.error(err);
        return res.status(500).json({
            success : false ,
            error : err.message,
            message : "Error while updating the section"
        })
    }
}

//todo : delete subsection
exports.deleteSubSection = async(req,res) => {
    try{
        const {subSectionId  , sectionId} = req.body

    
        // console.log("subsectionId: ",subSectionId)
        await Section.findByIdAndUpdate(
            {_id:sectionId},
            {
                $pull : {
                    subSection : subSectionId,
                },
            }
        );

        const subSectionDetails = await SubSection.findById(subSectionId);
        console.log(subSectionDetails.videoUrl);
        await deleteResourceFromCloudinary(subSectionDetails.videoUrl);


        const subSection = await SubSection.findByIdAndDelete({ _id: subSectionId })

        

        if (!subSection) {
            return res
                .status(404)
                .json({ success: false, message: "SubSection not found" })
        }

        const updatedSection = await Section.findById(sectionId).populate('subSection');

           // In frontned we have to take care - when subsection is deleted we are sending ,
        // only section data not full course details as we do in others 

        // success response
        return res.json({
            success: true,
            data: updatedSection,
            message: "SubSection deleted successfully",
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            success: false,

            error: error.message,
            message: "An error occurred while deleting the SubSection",
        })
    }
}
