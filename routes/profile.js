const express = require("express");
const router = express.Router();

const{auth , isInstructor } = require("../middlewares/auth");

//controllers
const{
    updateProfile , 
    getUserDetails,
    deleteAccount,
    updateUserProfileImage,
    deleteUserProfileImage,
    getEnrolledCourses,
    instructorDashboard
} = require("../controllers/Profile");

// ********************************************************************************************************
//                                      Profile routes
// ********************************************************************************************************

// Delete User Account
router.delete('/deleteProfile', auth, deleteAccount);
router.put('/updateProfile', auth, updateProfile);
router.get('/getUserDetails', auth, getUserDetails);
// update profile image
router.put('/updateUserProfileImage', auth, updateUserProfileImage);
router.delete('/deleteProfileImage',auth,deleteUserProfileImage);
// Get Enrolled Courses
router.get('/getEnrolledCourses' , auth , getEnrolledCourses);
// instructor Dashboard Details
router.get('/instructorDashboard', auth, isInstructor, instructorDashboard);

module.exports = router;