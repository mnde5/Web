const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    lessonId: {
      type: String,
      required: [true, 'lessonId шаардлагатай'],
      trim: true,
    },
    userId: {
      type: String,
      required: [true, 'userId шаардлагатай'],
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    grade: {
      type: Number,
      default: null,
    },
    gradedBy: {
      type: String,
      default: null,
    },
    gradedAt: {
      type: Date,
      default: null,
    },
    comment: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'graded', 'returned'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for fast lesson-based lookups
submissionSchema.index({ lessonId: 1, userId: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
