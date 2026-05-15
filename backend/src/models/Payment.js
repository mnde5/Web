const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    school_id: {
      type: String,
      required: [true, 'school_id шаардлагатай'],
      trim: true,
    },
    user_id: {
      type: String,
      required: [true, 'user_id шаардлагатай'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'amount шаардлагатай'],
      min: [0, 'amount 0-ээс бага байж болохгүй'],
    },
    bank_receipt: {
      type: String,
      default: '',
      trim: true,
    },
    receipt_image_url: {
      type: String,
      default: '',
    },
    receipt_file_name: {
      type: String,
      default: '',
      trim: true,
    },
    receipt_file_type: {
      type: String,
      default: '',
      trim: true,
    },
    receipt_uploaded_on: {
      type: Date,
      default: null,
    },
    payment_date: {
      type: Date,
      default: Date.now,
    },
    payment_type: {
      type: String,
      default: 'bank_transfer',
      trim: true,
    },
    requested_payment_method: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'cancelled'],
      default: 'pending',
    },
    course_count: {
      type: Number,
      default: 0,
    },
    credits: {
      type: Number,
      default: 0,
    },
    course_ids: {
      type: [String],
      default: [],
    },
    courses: {
      type: Array,
      default: [],
    },
    created_by: {
      type: String,
      default: '',
      trim: true,
    },
    verified_by: {
      type: String,
      default: '',
      trim: true,
    },
    verified_on: {
      type: Date,
      default: null,
    },
    rejected_by: {
      type: String,
      default: '',
      trim: true,
    },
    rejected_on: {
      type: Date,
      default: null,
    },
    rejected_reason: {
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

if (typeof paymentSchema.index === 'function') {
  paymentSchema.index({ school_id: 1, user_id: 1, createdAt: -1 });
  paymentSchema.index({ school_id: 1, status: 1 });
}

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
