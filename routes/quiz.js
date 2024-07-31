const express = require('express');
const router = express.Router();


const {
    CreateQuiz , 
    editQuestion,
    editQuiz,
    getQuiz,
    submitQuiz,
    getResult
}   = require("../controllers/Quiz");

//middlewait 
const { auth, isAdmin, isInstructor, isStudent } = require('../middlewares/auth')

router.post('/createQuiz',auth ,isInstructor, CreateQuiz );
router.post('/editQuestion',auth ,isInstructor, editQuestion );
router.post('/editQuiz',auth ,isInstructor, editQuiz );
router.get('/getQuiz',auth ,isInstructor, getQuiz );
router.post('/submitQuiz',auth ,isStudent, submitQuiz );
router.get('/getResult',auth ,isStudent, getResult );


module.exports = router;