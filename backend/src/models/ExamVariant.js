const mongoose = require('mongoose');

const examVariantSchema = new mongoose.Schema(
  {
    exam_id: {
      type: String,
      required: [true, 'exam_id шаардлагатай'],
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
    question_ids: {
      type: [String],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'published',
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

if (typeof examVariantSchema.index === 'function') {
  examVariantSchema.index({ exam_id: 1, order: 1 });
}

const ExamVariant = mongoose.model('ExamVariant', examVariantSchema);

module.exports = ExamVariant;
