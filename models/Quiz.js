const mongoose = require('mongoose');
const { Schema } = mongoose;

const quizSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'  // Reference to the Question model
  }],
  timeLimit: {
    type: Number,
    required: true
  }
});

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
