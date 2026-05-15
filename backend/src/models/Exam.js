const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    course_id: {
      type: String,
      required: [true, 'course_id шаардлагатай'],
      trim: true,
    },
    school_id: {
      type: String,
      default: '',
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'name шаардлагатай'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    duration: {
      type: Number,
      default: 60,
      min: [1, 'duration 1-ээс бага байж болохгүй'],
    },
    total_point: {
      type: Number,
      default: 100,
      min: [0, 'total_point 0-ээс бага байж болохгүй'],
    },
    starts_on: {
      type: Date,
      default: null,
    },
    ends_on: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
    },
    created_by: {
      type: String,
      default: '',
      trim: true,
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

if (typeof examSchema.index === 'function') {
  examSchema.index({ course_id: 1, createdAt: -1 });
  examSchema.index({ school_id: 1, status: 1 });
}

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
