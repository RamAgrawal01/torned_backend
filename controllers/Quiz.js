const Question = require("../models/Question");
const Quiz = require('../models/Quiz');
const Section = require("../models/Section");
const Result = require("../models/quizResult")
const User = require("../models/User")
const mongoose = require('mongoose');  // Import mongoose

/********** Create Quiz *********/
/********** Create and Add Questions to Quiz *********/
exports.CreateQuiz = async (req, res) => {
    try {
      const { title, description, questions, timeLimit, sectionId } = req.body;
      const instructorId = req.user.id;
  
      if (!title || !description || !questions || !timeLimit || !sectionId) {
        return res.status(401).json({
          success: false,
          message: "All fields are required"
        });
      }
  
      // Generate IDs and save questions
      const questionsWithIds = questions.map(question => ({
        _id: new mongoose.Types.ObjectId(),
        ...question
      }));
  
      const savedQuestions = await Question.insertMany(questionsWithIds);
  
      // Push questions into quizSchema
      const quiz = await Quiz.create({
        title,
        description,
        questions: savedQuestions.map(q => q._id), // Save only question IDs
        timeLimit
      });
  
      // Add the quiz to the section
      const section = await Section.findById(sectionId);
      if (!section) {
        return res.status(401).json({
          success: false,
          message: "Section not found"
        });
      }
      
      return res.status(201).json({
        success: true,
        message: "Quiz created successfully",
        quiz
      });
  
    } catch (error) {
      console.log("Error while creating the quiz: ", error);
      return res.status(500).json({
        success: false,
        message: "Quiz cannot be created",
        error: error.message
      });
    }
  };
///***********Update Quiz****************** */
exports.editQuiz = async (req, res) => {
    try {
      const { quizId, title, description, questions, timeLimit } = req.body;
      const instructorId = req.user.id; // Assuming you're getting the instructor ID from a middleware that verifies the user
  
      if (!quizId || !title || !description || !questions || !timeLimit) {
        return res.status(401).json({
          success: false,
          message: "All fields are required",
        });
      }
  
      // Find the quiz by ID
      const quiz = await Quiz.findById(quizId);
  
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found",
        });
      }
  
      // Update the quiz fields
      quiz.title = title;
      quiz.description = description;
      quiz.questions = questions;
      quiz.timeLimit = timeLimit;
  
      // Save the updated quiz
      await quiz.save();
  
      return res.status(200).json({
        success: true,
        message: "Quiz updated successfully",
        quiz,
      });
    } catch (error) {
      console.log("Error while editing the quiz: ", error);
      return res.status(500).json({
        success: false,
        message: "Quiz cannot be edited",
        error: error.message,
      });
    }
  };


/////**********Edit Question************* */
  exports.editQuestion = async (req, res) => {
    try {
      const { quizId, questionId, questionText, options, correctAnswer } = req.body;
  
      if (!quizId || !questionId || !questionText || !options || !correctAnswer) {
        return res.status(401).json({
          success: false,
          message: "All fields are required"
        });
      }
  
      // Find the quiz by ID
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found"
        });
      }
  
      // Find the question by ID
      const question = await Question.findById(questionId);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found"
        });
      }
  
      // Update the question fields
      question.questionText = questionText;
      question.options = options;
      question.correctAnswer = correctAnswer;
  
      // Save the updated question
      await question.save();
  
      // Optionally, update the quiz to reflect changes if needed
      // For example, to ensure the quiz reflects the updated question
      await Quiz.findByIdAndUpdate(quizId, { $set: { "questions.$[elem]": question._id } }, { arrayFilters: [{ "elem": question._id }], new: true });
  
      return res.status(200).json({
        success: true,
        message: "Question updated successfully",
        question
      });
  
    } catch (error) {
      console.log("Error while editing the question: ", error);
      return res.status(500).json({
        success: false,
        message: "Question cannot be edited",
        error: error.message
      });
    }
  };
  
//***************Get particular quiz*********** */
exports.getQuiz = async(req,res) => {
    try{
        const {quizId} = req.body;

        const quiz = await Quiz.findById(quizId).populate({path:"questions"})

        if(!quiz){
            return res.status(401).json({
                success : false ,
                message : "Quiz not found"
            })
        }
        return res.status(201).json({
            success : true ,
            message : "Quiz fetch success",
            quiz
        })
    }
    catch(error){
        console.error('Error while geting quiz',error)
        return res.status(500).json({
            success : false ,
            error : error.message
        })
    }
}

//***************Submit QUiz*************** */


exports.submitQuiz = async (req, res) => {
    const { quizId, responses } = req.body;
    const studentId = req.user.id;

    console.log("Student id while submitting ",studentId)
  
    try {
      let score = 0;
      const detailedResponse = [];
  
      for (const response of responses) {
        const question = await Question.findById(response.questionId);
        if (!question) {
          return res.status(404).json({
            success: false,
            message: `${response.questionId} not found`
          });
        }
  
        const isCorrect = response.answer === question.correctAnswer;
        if (isCorrect) {
          score += 1;
        }
  
        detailedResponse.push({
          questionId: question._id,
          answer: response.answer,
          isCorrect,
          
        });
      }
  
      const result = new Result({
        studentId,
        quizId,
        score,
        responses: detailedResponse
      });
      await result.save();
  
      // Add the result to the user's quizResults
      const user = await User.findById(studentId);
      user.quizResults.push(result._id);
      await user.save();
  
      // Calculate rank
      const allResults = await Result.find({ quizId }).sort({ score: -1 });
      const rank = allResults.findIndex(r => r._id.toString() === result._id.toString()) + 1;
      result.rank = rank;
      await result.save();
  
      res.status(201).json({
        success: true,
        message: "Quiz Submitted Successfully",
        result
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      res.status(500).json({ error: 'Error submitting quiz' });
    }
  };

//***********Get result**************** */
exports.getResult = async (req, res) => {
 
    const  studentId  = req.user.id;
  try {

  
    const { quizId } = req.body;

    console.log("Student Id : ",studentId);
    console.log("QuizID: ",quizId);
  
    if (!quizId) {
      return res.status(400).json({
        success: false,
        message: 'Quiz ID required',
      });
    }

    const result = await Result.findOne({ studentId, quizId }).populate("quizId").populate("responses.questionId")

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Result fetched successfully',
      result: result,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching results',
      error: error.message,
    });
  }
};
