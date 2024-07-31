const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    sectionName: {
        type: String,
        required: true,
    },
    subSection: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubSection',
    }],
    quizzes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
    }],
});

module.exports = mongoose.models.Section || mongoose.model('Section', sectionSchema);
