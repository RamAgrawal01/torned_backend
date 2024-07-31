const Category = require("../models/Category");
const Course = require("../models/Course");
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const { deleteResourceFromCloudinary } = require("../utils/imageUploader");

//create tag for handler finction
exports.createCetegory = async(req,res) => {
    try{
        const {name , description} = req.body;
        
        if(!name || !description) {
            return res.status(400).json({
                success : false ,
                message : 'All fields are required',

            })
        }
        //create entry in db
        const CetegoryDetails = await Category.create({
            name : name,
            description : description,
        });
        console.log(CetegoryDetails);
        return res.status(200).json({
            success : true,
            message : "Tag successfully created",
        })

    }
    catch(err){
        return res.status(500).json({
            success : false ,
            message : err.message,
        })
    }
}

//GET ALL THE TAGS 
exports.showAllCetegories = async(req,res) => {
    try{
        //name and description milna chaiye
        const allTags = await Category.find({},{name:true , description:true});
        res.status(200).json({
            success : true ,
            message : "All Tags get successfully",
            data : allTags
        })
    }
    catch(err){

    }
}

// get Random Integer
function getRandomInt(max) {
    return Math.floor(Math.random() * max)
}

//GET ALL THE CETEGORY PAGE DETAILS
exports.getCetegoryPageDetails = async (req, res) => {
    try {
        const { categoryId } = req.body
        // console.log("PRINTING CATEGORY ID: ", categoryId);

        // Get courses for the specified category
        const selectedCategory = await Category.findById(categoryId)
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate: "ratingAndReviews",
                populate: {
                    path: "instructor",
                },
            })
            
            .exec()

        // console.log('selectedCategory = ', selectedCategory)
        // Handle the case when the category is not found
        if (!selectedCategory) {
            // console.log("Category not found.")
            return res.status(404).json({ success: false, message: "Category not found" })
        }



        // Handle the case when there are no courses
        if (selectedCategory.courses.length === 0) {
            // console.log("No courses found for the selected category.")
            return res.status(404).json({
                success: false,
                data: null,
                message: "No courses found for the selected category.",
            })
        }

        // Get courses for other categories
        const categoriesExceptSelected = await Category.find({
            _id: { $ne: categoryId },
        })



        // get Random Integer
function getRandomInt(max) {
    return Math.floor(Math.random() * max)
}

        let differentCategory = await Category.findOne(
            categoriesExceptSelected[getRandomInt(categoriesExceptSelected.length)]
                ._id
        )
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate: {
                    path: "instructor",
                },
            })
            .exec()

        //console.log("Different COURSE", differentCategory)
        // Get top-selling courses across all categories
        const allCategories = await Category.find()
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate: {
                    path: "instructor",
                },
            })
            .exec()

        const allCourses = allCategories.flatMap((category) => category.courses)
        const mostSellingCourses = allCourses
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 10)

        // console.log("mostSellingCourses COURSE", mostSellingCourses)
        res.status(200).json({
            success: true,
            data: {
                selectedCategory,
                differentCategory,
                mostSellingCourses,
            },
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        })
    }
}

// ================ delete Category ================
exports.deleteCetegory = async (req, res) => {
    try {
        // Extract data
        const { categoryId } = req.body;

        // Validation
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'categoryId is required'
            });
        }

        // Find the category with courses
        const category = await Category.findById(categoryId).populate('courses');
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Iterate over each course
        const courses = category.courses;
        for (let i = 0; i < courses.length; i++) {
            const course = await Course.findById(courses[i]._id).populate('courseContent');
            
            // Iterate over each section
            const sections = course.courseContent;
            for (let j = 0; j < sections.length; j++) {
                const section = await Section.findById(sections[j]._id).populate('subSection');

                // Iterate over each subsection
                const subSections = section.subSection;
                for (let k = 0; k < subSections.length; k++) {
                    const sS = await SubSection.findById(subSections[k]._id);
                
                    if (sS && sS.videoUrl) {
                        console.log("Deleting video: ", sS.videoUrl);
                        // Delete the video lecture if needed
                        await deleteResourceFromCloudinary(sS.videoUrl);
                    }
                
                    // Delete the subsection
                    await SubSection.findByIdAndDelete(subSections[k]._id);
                }

                // Delete the section
                await Section.findByIdAndDelete(sections[j]._id);
            }


            // Delete the course thumbnail if needed (assuming you have a function for this)
            if (course.thumbnail) {
                await deleteResourceFromCloudinary(course.thumbnail);
            }


          

            // // Unenroll students from the course
            // const studentsEnrolled = course.studentsEnrolled;
            // for (let m = 0; m < studentsEnrolled.length; m++) {
            //     await User.findByIdAndUpdate(studentsEnrolled[m], {
            //         $pull: { courses: courses[i]._id },
            //     });
            // }

            // Delete the course
            await Course.findByIdAndDelete(courses[i]._id);
        }

        // Finally, delete the category
        await Category.findByIdAndDelete(categoryId);

        res.status(200).json({
            success: true,
            message: 'Category and all its related courses, sections, and subsections deleted successfully'
        });
    } catch (error) {
        console.log('Error while deleting Category and its related entities');
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Error while deleting Category and its related entities',
            error: error.message
        });
    }
}