const express = require("express");
const router = express.Router();


//course controllers
const{
    createCourse,
    showAllCourses,
    getCourseDetails,
    editCourse,
    getInstructorCourses,
    deleteCourse,
    getFullCourseDetails
} = require("../controllers/Course");

//cetegory controllers

const{
    createCetegory,
    showAllCetegories,
    getCetegoryPageDetails,
    deleteCetegory
} = require ("../controllers/Cetegory");


//section controllers
const {
    createSection,
    updateSection,
    deleteSection,
} = require('../controllers/Section');

//subsection controllers
const {
    createSubSection,
    updateSubSection,
    deleteSubSection
} = require('../controllers/SubSection');

//rating controllers
const {
    createRating,
    getAverageRating,
    getAllRatingReview
} = require('../controllers/RatingAndReview');

//courseProresss
const {updateCourseProgress} = require("../controllers/courseProgress")

//middlewait 
const { auth, isAdmin, isInstructor, isStudent } = require('../middlewares/auth')


// ********************************************************************************************************
//                                      Course routes
// ********************************************************************************************************
// Courses can Only be Created by Instructors

router.post('/createCourse', auth, isInstructor, createCourse);

//Add a Section to a Course
router.post('/addSection', auth, isInstructor, createSection);

// Update a Section
router.post('/updateSection', auth, isInstructor, updateSection);

// Delete a Section
router.post('/deleteSection', auth, isInstructor, deleteSection);


// Add a Sub Section to a Section
router.post('/addSubSection', auth, isInstructor, createSubSection);

// Edit Sub Section
router.post('/updateSubSection', auth, isInstructor, updateSubSection);

// Delete Sub Section
router.post('/deleteSubSection', auth, isInstructor, deleteSubSection);

// ******************COURSES********************//

// Get Details for a Specific Courses
router.post('/getCourseDetails', getCourseDetails);
// Get all Courses
router.get('/getAllCourses', showAllCourses);
// Edit Course routes
router.post("/editCourse", auth, isInstructor, editCourse)
// Get all Courses Under a Specific Instructor
router.get("/getInstructorCourses", auth, isInstructor, getInstructorCourses)
// Delete a Course
router.delete("/deleteCourse", auth, isInstructor, deleteCourse)
// get full course details
router.post('/getFullCourseDetails', auth, getFullCourseDetails);



// ********************************************************************************************************
//                                      Category routes (Only by Admin)
// ********************************************************************************************************
// Category can Only be Created by Admin

router.post('/createCategory', auth, isAdmin, createCetegory);
router.delete('/deleteCategory', auth, isAdmin, deleteCetegory);
router.get('/showAllCategories', showAllCetegories);
router.post("/getCategoryPageDetails", getCetegoryPageDetails);

// ********************************************************************************************************
//                                      Rating and Review
// ********************************************************************************************************
router.post('/createRating', auth, isStudent, createRating);

router.get('/getAverageRating', getAverageRating);

router.get('/getReviews', getAllRatingReview);

//********************//******************** */ */
router.post('/updateCourseProgress',auth , isStudent , updateCourseProgress)


module.exports = router;
