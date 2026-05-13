const express = require('express');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');

const router = express.Router();

function normalizeCourseIds(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function buildPaymentPayload(params, body = {}) {
  return {
    school_id: String(params.schoolId),
    user_id: String(params.userId),
    amount: Number(body.amount) || 0,
    bank_receipt: body.bank_receipt || '',
    payment_date: body.payment_date || new Date(),
    payment_type: body.payment_type || body.requested_payment_method || 'bank_transfer',
    requested_payment_method: body.requested_payment_method || '',
    status: body.status || 'pending',
    course_count: Number(body.course_count) || 0,
    credits: Number(body.credits) || 0,
    course_ids: normalizeCourseIds(body.course_ids),
    courses: Array.isArray(body.courses) ? body.courses : [],
    created_by: body.current_user || body.created_by || '',
  };
}

function getVerifiedFilter() {
  return {
    $or: [
      { status: 'verified' },
      { verified_on: { $ne: null } },
      { verified_by: { $nin: ['', null] } },
    ],
  };
}

router.get('/schools/:schoolId/users/:userId/payments', async (req, res) => {
  try {
    const items = await Payment.find({
      school_id: String(req.params.schoolId),
      user_id: String(req.params.userId),
    }).sort({ createdAt: -1 });

    return res.json({ success: true, items, total: items.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/schools/:schoolId/users/:userId/payments', async (req, res) => {
  try {
    const payment = new Payment(buildPaymentPayload(req.params, req.body));
    await payment.save();
    return res.status(201).json({ success: true, item: payment });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/schools/:schoolId/users/:userId/payments/:payId/verify', async (req, res) => {
  try {
    const { schoolId, userId, payId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(payId)) {
      return res.status(400).json({ success: false, message: 'Буруу payment ID формат' });
    }

    const payment = await Payment.findOne({
      _id: payId,
      school_id: String(schoolId),
      user_id: String(userId),
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Төлбөр олдсонгүй' });
    }

    payment.status = 'verified';
    payment.verified_by = req.body.current_user || req.body.verified_by || '';
    payment.verified_on = new Date();
    await payment.save();

    return res.json({ success: true, item: payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/schools/:schoolId/payment-debt-report', async (req, res) => {
  try {
    const schoolId = String(req.params.schoolId);
    const payments = await Payment.find({ school_id: schoolId }).sort({ createdAt: -1 });
    const verifiedFilter = getVerifiedFilter();
    const rows = new Map();

    payments.forEach((payment) => {
      const userId = String(payment.user_id);
      const current = rows.get(userId) || {
        user_id: userId,
        pending_payment_amount: 0,
        paid_amount: 0,
        last_payment_amount: 0,
        last_payment_date: null,
        payment_status_name: 'Төлбөр байхгүй',
      };

      const verified = verifiedFilter.$or.some((condition) => {
        if (condition.status) return payment.status === condition.status;
        if (condition.verified_on) return Boolean(payment.verified_on);
        if (condition.verified_by) return Boolean(payment.verified_by);
        return false;
      });

      if (verified) current.paid_amount += Number(payment.amount) || 0;
      else current.pending_payment_amount += Number(payment.amount) || 0;

      if (!current.last_payment_date || new Date(payment.createdAt) > new Date(current.last_payment_date)) {
        current.last_payment_amount = payment.amount;
        current.last_payment_date = payment.payment_date || payment.createdAt;
      }

      current.payment_status_name = current.pending_payment_amount > 0 ? 'Хүлээлт' : 'Баталгаажсан';
      current.debt_status_name = current.payment_status_name;
      rows.set(userId, current);
    });

    return res.json({ success: true, items: Array.from(rows.values()) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/schools/:schoolId/users/:userId/debt', async (req, res) => {
  try {
    const pending = await Payment.find({
      school_id: String(req.params.schoolId),
      user_id: String(req.params.userId),
      status: { $ne: 'verified' },
      verified_on: null,
    });
    const debtAmount = pending.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    return res.json({
      success: true,
      school_id: req.params.schoolId,
      user_id: req.params.userId,
      debt_amount: debtAmount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
