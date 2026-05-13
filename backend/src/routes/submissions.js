const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');

// ────────────────────────────────────────────────────────────
// GET /lessons/:lessonId/submissions
// Хичээлийн сэдэвт илгээсэн бүх даалгаврыг авах
// ────────────────────────────────────────────────────────────
router.get('/lessons/:lessonId/submissions', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { userId } = req.query;

    const filter = { lessonId };
    if (userId) filter.userId = userId;

    const submissions = await Submission.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      items: submissions,
      total: submissions.length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// GET /submissions/:id
// Нэг даалгаврыг ID-аар авах
// ────────────────────────────────────────────────────────────
router.get('/submissions/:id', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Даалгавар олдсонгүй' });
    }
    return res.json({ success: true, item: submission });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Буруу ID формат' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// POST /lessons/:lessonId/submissions
// Шинэ даалгавар илгээх
// ────────────────────────────────────────────────────────────
router.post('/lessons/:lessonId/submissions', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { userId, content, fileUrl, comment } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId шаардлагатай' });
    }

    const submission = new Submission({
      lessonId,
      userId,
      content: content || '',
      fileUrl: fileUrl || '',
      comment: comment || '',
      status: 'pending',
    });

    await submission.save();

    return res.status(201).json({ success: true, item: submission });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// PUT /submissions/:id
// Даалгавар засах (оюутан) эсвэл оноо тавих (багш)
// ────────────────────────────────────────────────────────────
router.put('/submissions/:id', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Даалгавар олдсонгүй' });
    }

    const { content, fileUrl, comment, grade, gradedBy } = req.body;

    // Оюутан засах (оноо тавиагүй үед)
    if (submission.grade === null || submission.grade === undefined) {
      if (content !== undefined) submission.content = content;
      if (fileUrl !== undefined) submission.fileUrl = fileUrl;
      if (comment !== undefined) submission.comment = comment;
    }

    // Багш оноо тавих
    if (grade !== undefined && grade !== null) {
      submission.grade = grade;
      submission.gradedBy = gradedBy || null;
      submission.gradedAt = new Date();
      submission.status = 'graded';
    }

    await submission.save();

    return res.json({ success: true, item: submission });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Буруу ID формат' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// DELETE /submissions/:id
// Даалгавар устгах
// ────────────────────────────────────────────────────────────
router.delete('/submissions/:id', async (req, res) => {
  try {
    const submission = await Submission.findByIdAndDelete(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Даалгавар олдсонгүй' });
    }
    return res.json({ success: true, message: 'Амжилттай устгалаа' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Буруу ID формат' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
