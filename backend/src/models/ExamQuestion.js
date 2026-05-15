const mongoose = require('mongoose');

const examQuestionSchema = new mongoose.Schema(
  {
    exam_id: {
      type: String,
      required: [true, 'exam_id шаардлагатай'],
      trim: true,
    },
    question: {
      type: String,
      required: [true, 'question шаардлагатай'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['single_choice', 'text'],
      default: 'single_choice',
    },
    point: {
      type: Number,
      default: 1,
      min: [0, 'point 0-ээс бага байж болохгүй'],
    },
    order: {
      type: Number,
      default: 0,
    },
    answers: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        ret.created_on = ret.createdAt;
        ret.updated_on = ret.updatedAt;
        delete ret._id;
        delete ret.__v;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

if (typeof examQuestionSchema.index === 'function') {
  examQuestionSchema.index({ exam_id: 1, order: 1 });
}

const ExamQuestion = mongoose.model('ExamQuestion', examQuestionSchema);

module.exports = ExamQuestion;
