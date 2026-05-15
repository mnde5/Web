const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema(
  {
    exam_id: {
      type: String,
      required: [true, 'exam_id шаардлагатай'],
      trim: true,
    },
    student_id: {
      type: String,
      required: [true, 'student_id шаардлагатай'],
      trim: true,
    },
    variant_id: {
      type: String,
      default: '',
      trim: true,
    },
    started_on: {
      type: Date,
      default: Date.now,
    },
    submitted_on: {
      type: Date,
      default: Date.now,
    },
    answers: {
      type: Array,
      default: [],
    },
    total_point: {
      type: Number,
      default: 0,
    },
    grade_point: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['submitted', 'graded'],
      default: 'submitted',
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

if (typeof examAttemptSchema.index === 'function') {
  examAttemptSchema.index({ exam_id: 1, student_id: 1, createdAt: -1 });
}

const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);

module.exports = ExamAttempt;
