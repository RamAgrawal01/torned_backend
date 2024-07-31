const express = require('express');
const router = express.Router();

// Controllers
const {
    signUp,
    login,
    sendOTP,
    changePassword
} = require('../controllers/Auth');


// Resetpassword controllers
const {
    resetPasswordToken,
    resetPassword,
} = require('../controllers/ResetPassword');



// Middleware
const { auth} = require('../middlewares/auth');



// Routes for Login, Signup, and Authentication

// ********************************************************************************************************
//                                      Authentication routes
// ********************************************************************************************************

// Route for user signup
router.post('/signUp', signUp);

// Route for user login
router.post('/login', login);

// Route for sending OTP to the user's email
router.post('/sendotp', sendOTP);

// Route for Changing the password
router.post('/changePassword', auth, changePassword);




// ********************************************************************************************************
//                                      Reset Password
// ********************************************************************************************************

// Route for generating a reset password token
router.post('/reset-password-token', resetPasswordToken);

// Route for resetting user's password after verification
router.post("/reset-password", resetPassword);






module.exports = router;