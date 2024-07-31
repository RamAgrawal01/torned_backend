const Section = require("../models/Section");
const Course = require("../models/Course");

exports.createSection = async (req, res) => {
    try {
        // Fetch data
        const { sectionName, courseId } = req.body;
        console.log("sectionName : ",sectionName);
        console.log("courseId: ",courseId);
        // Data validation
        if (!sectionName || !courseId) {
            return res.status(400).json({
                success: false,
                message: 'Missing Fields',
            });
        }

        // Create section in db
        const newSection = await Section.create({ sectionName });

        // Update course with section object id
        const updatedCourseDetails = await Course.findByIdAndUpdate(
            courseId,
            {
                $push: {
                    courseContent: newSection._id,
                },
            },
            { new: true }
        ).populate({
            path: 'courseContent',
            populate: {
                path: 'subSection',
            },
        });

        // Return response
        return res.status(200).json({
            success: true,
            message: 'Section created successfully',
            updatedCourseDetails,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Unable to create section',
            error: err.message,
        });
    }
};


//updated section
exports.updateSection = async (req, res) => {
    try {
        // extract data
        const { sectionName, sectionId, courseId } = req.body;

        // validation
        if (!sectionId) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // update section name in DB
        await Section.findByIdAndUpdate(sectionId, { sectionName }, { new: true });
       
        const updatedCourseDetails = await Course.findById(courseId)
            .populate({
                path: 'courseContent',
                populate: {
                    path: 'subSection'
                }
            })
          
        res.status(200).json({
            success: true,
            data:updatedCourseDetails,
            message: 'Section updated successfully'
        });
    }
    catch (error) {
        console.log('Error while updating section');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while updating section'
        })
    }
}

//DELETE SECTIOnN
exports.deleteSection = async (req, res) => {
    try {
        const { sectionId, courseId } = req.body;
        // console.log('sectionId = ', sectionId);

        // delete section by id from DB
        await Section.findByIdAndDelete(sectionId);

        const updatedCourseDetails = await Course.findById(courseId)
            .populate({
                path: 'courseContent',
                populate: {
                    path: 'subSection'
                }
            })

        res.status(200).json({
            success: true,
            data: updatedCourseDetails,
            message: 'Section deleted successfully'
        })
    }
    catch (error) {
        console.log('Error while deleting section');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while deleting section'
        })
    }
}