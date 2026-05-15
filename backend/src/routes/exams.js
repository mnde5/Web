const express = require('express');
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const ExamQuestion = require('../models/ExamQuestion');
const ExamAttempt = require('../models/ExamAttempt');
const ExamVariant = require('../models/ExamVariant');

const router = express.Router();

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeAnswers(answers = []) {
  if (!Array.isArray(answers)) return [];
  return answers
    .map((answer, index) => ({
      id: String(answer.id || answer.answer_id || `a${index + 1}`),
      text: String(answer.text || answer.answer_text || '').trim(),
      is_correct: Boolean(answer.is_correct),
    }))
    .filter((answer) => answer.text);
}

function buildExamPayload(params, body = {}) {
  return {
    course_id: String(params.courseId || body.course_id || ''),
    school_id: String(body.school_id || ''),
    name: body.name || body.title || '',
    description: body.description || '',
    duration: Number(body.duration) || 60,
    total_point: Number(body.total_point) || 0,
    starts_on: normalizeDate(body.starts_on),
    ends_on: normalizeDate(body.ends_on),
    status: body.status || 'draft',
    created_by: body.current_user || body.created_by || '',
  };
}

function buildQuestionPayload(examId, body = {}, index = 0) {
  return {
    exam_id: String(examId),
    question: body.question || body.text || '',
    type: body.type || 'single_choice',
    point: Number(body.point) || 1,
    order: Number(body.order ?? index),
    answers: normalizeAnswers(body.answers),
  };
}

function normalizeQuestionIds(value) {
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

function buildVariantPayload(examId, body = {}, index = 0) {
  return {
    exam_id: String(examId),
    name: body.name || body.title || `Вариант ${index || 1}`,
    description: body.description || '',
    question_ids: normalizeQuestionIds(body.question_ids),
    order: Number(body.order ?? index) || 0,
    status: body.status || 'published',
    created_by: body.current_user || body.created_by || '',
  };
}

function toPlain(doc) {
  if (!doc) return null;
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value));
}

function getQuestionId(question) {
  return String(question.id || question._id);
}

function getCorrectAnswers(question) {
  return (question.answers || []).filter((answer) => answer.is_correct);
}

function gradeAnswers(questions, submittedAnswers = []) {
  const submittedByQuestion = new Map(
    submittedAnswers.map((answer) => [String(answer.question_id), answer]),
  );

  let gradePoint = 0;
  const checkedAnswers = questions.map((question) => {
    const questionId = getQuestionId(question);
    const submitted = submittedByQuestion.get(questionId) || {};
    const correctAnswers = getCorrectAnswers(question);
    const selectedAnswerId = String(submitted.answer_id || '');
    const selectedText = String(submitted.answer_text || '').trim();
    let isCorrect = false;

    if (question.type === 'text') {
      isCorrect = correctAnswers.some((answer) => (
        String(answer.text || '').trim().toLowerCase() === selectedText.toLowerCase()
      ));
    } else {
      isCorrect = correctAnswers.some((answer) => String(answer.id) === selectedAnswerId);
    }

    if (isCorrect) gradePoint += Number(question.point) || 0;

    return {
      question_id: questionId,
      answer_id: submitted.answer_id || '',
      answer_text: submitted.answer_text || '',
      is_correct: isCorrect,
      point: isCorrect ? Number(question.point) || 0 : 0,
    };
  });

  const totalPoint = questions.reduce((sum, question) => sum + (Number(question.point) || 0), 0);
  return { checkedAnswers, gradePoint, totalPoint };
}

function buildResult(attempt, exam, questions) {
  if (!attempt) return null;
  const attemptAnswers = new Map((attempt.answers || []).map((answer) => [String(answer.question_id), answer]));

  return {
    attempt: toPlain(attempt),
    exam: toPlain(exam),
    questions: questions.map((question) => {
      const plain = toPlain(question);
      const questionId = getQuestionId(plain);
      return {
        ...plain,
        selected_answer: attemptAnswers.get(questionId) || null,
        correct_answers: getCorrectAnswers(plain),
      };
    }),
  };
}

function buildReport(exam, questions, attempts, variants) {
  const totalPoint = questions.reduce((sum, question) => sum + (Number(question.point) || 0), 0);
  const scores = attempts.map((attempt) => Number(attempt.grade_point) || 0);
  const averageScore = scores.length
    ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
    : 0;
  const passThreshold = totalPoint * 0.6;
  const passCount = attempts.filter((attempt) => (Number(attempt.grade_point) || 0) >= passThreshold).length;
  const questionStats = questions.map((question) => {
    const questionId = getQuestionId(toPlain(question));
    const answers = attempts
      .flatMap((attempt) => attempt.answers || [])
      .filter((answer) => String(answer.question_id) === questionId);
    const correctCount = answers.filter((answer) => answer.is_correct).length;
    const wrongCount = answers.length - correctCount;
    return {
      question_id: questionId,
      question: question.question,
      total_answers: answers.length,
      correct_count: correctCount,
      wrong_count: wrongCount,
      correct_rate: answers.length ? Math.round((correctCount / answers.length) * 100) : 0,
    };
  });

  return {
    exam: toPlain(exam),
    total_point: totalPoint,
    question_count: questions.length,
    variant_count: variants.length,
    attempt_count: attempts.length,
    average_score: averageScore,
    highest_score: scores.length ? Math.max(...scores) : 0,
    lowest_score: scores.length ? Math.min(...scores) : 0,
    pass_count: passCount,
    fail_count: Math.max(0, attempts.length - passCount),
    question_stats: questionStats,
  };
}

router.get('/exams', async (_req, res) => {
  try {
    const items = await Exam.find({}).sort({ createdAt: -1 });
    return res.json({ success: true, items, total: items.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/courses/:courseId/exams', async (req, res) => {
  try {
    const items = await Exam.find({ course_id: String(req.params.courseId) }).sort({ createdAt: -1 });
    return res.json({ success: true, items, total: items.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/schools/:schoolId/exams', async (req, res) => {
  try {
    const items = await Exam.find({ school_id: String(req.params.schoolId) }).sort({ createdAt: -1 });
    return res.json({ success: true, items, total: items.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/courses/:courseId/exams', async (req, res) => {
  try {
    const exam = new Exam(buildExamPayload(req.params, req.body));
    await exam.save();

    const questions = Array.isArray(req.body.questions)
      ? await Promise.all(req.body.questions.map((question, index) => {
        const examId = String(exam.id || exam._id);
        const nextQuestion = new ExamQuestion(buildQuestionPayload(examId, question, index + 1));
        return nextQuestion.save();
      }))
      : [];

    return res.status(201).json({ success: true, item: exam, questions });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/exams/:examId', async (req, res) => {
  try {
    if (!isObjectId(req.params.examId)) {
      return res.status(400).json({ success: false, message: 'Буруу exam ID формат' });
    }
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Шалгалт олдсонгүй' });
    return res.json({ success: true, item: exam });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/exams/:examId', async (req, res) => {
  try {
    if (!isObjectId(req.params.examId)) {
      return res.status(400).json({ success: false, message: 'Буруу exam ID формат' });
    }
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Шалгалт олдсонгүй' });

    Object.assign(exam, buildExamPayload({ courseId: exam.course_id }, { ...exam.toObject?.(), ...req.body }));
    await exam.save();
    return res.json({ success: true, item: exam });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/exams/:examId', async (req, res) => {
  try {
    if (!isObjectId(req.params.examId)) {
      return res.status(400).json({ success: false, message: 'Буруу exam ID формат' });
    }
    const exam = await Exam.findByIdAndDelete(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Шалгалт олдсонгүй' });
    await ExamQuestion.deleteMany({ exam_id: String(req.params.examId) });
    await ExamVariant.deleteMany({ exam_id: String(req.params.examId) });
    return res.json({ success: true, item: exam });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/exams/:examId/report', async (req, res) => {
  try {
    if (!isObjectId(req.params.examId)) {
      return res.status(400).json({ success: false, message: 'Буруу exam ID формат' });
    }
    const [exam, questions, attempts, variants] = await Promise.all([
      Exam.findById(req.params.examId),
      ExamQuestion.find({ exam_id: String(req.params.examId) }).sort({ order: 1 }),
      ExamAttempt.find({ exam_id: String(req.params.examId) }).sort({ createdAt: -1 }),
      ExamVariant.find({ exam_id: String(req.params.examId) }).sort({ order: 1 }),
    ]);

    if (!exam) return res.status(404).json({ success: false, message: 'Шалгалт олдсонгүй' });
    return res.json({ success: true, item: buildReport(exam, questions.map(toPlain), attempts.map(toPlain), variants.map(toPlain)) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/exams/:examId/variants', async (req, res) => {
  try {
    const items = await ExamVariant.find({ exam_id: String(req.params.examId) }).sort({ order: 1 });
    return res.json({ success: true, items, total: items.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/exams/:examId/variants', async (req, res) => {
  try {
    if (!isObjectId(req.params.examId)) {
      return res.status(400).json({ success: false, message: 'Буруу exam ID формат' });
    }
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Шалгалт олдсонгүй' });

    const variant = new ExamVariant(buildVariantPayload(req.params.examId, req.body, req.body.order || 1));
    await variant.save();
    return res.status(201).json({ success: true, item: variant });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/exams/:examId/variants/:id', async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Буруу variant ID формат' });
    }
    const variant = await ExamVariant.findById(req.params.id);
    if (!variant || String(variant.exam_id) !== String(req.params.examId)) {
      return res.status(404).json({ success: false, message: 'Вариант олдсонгүй' });
    }
    return res.json({ success: true, item: variant });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/exams/:examId/variants/:id', async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Буруу variant ID формат' });
    }
    const variant = await ExamVariant.findById(req.params.id);
    if (!variant || String(variant.exam_id) !== String(req.params.examId)) {
      return res.status(404).json({ success: false, message: 'Вариант олдсонгүй' });
    }
    Object.assign(variant, buildVariantPayload(req.params.examId, { ...variant.toObject?.(), ...req.body }, variant.order));
    await variant.save();
    return res.json({ success: true, item: variant });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/exams/:examId/questions', async (req, res) => {
  try {
    const items = await ExamQuestion.find({ exam_id: String(req.params.examId) }).sort({ order: 1 });
    return res.json({ success: true, items, total: items.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/exams/:examId/questions', async (req, res) => {
  try {
    const question = new ExamQuestion(buildQuestionPayload(req.params.examId, req.body, req.body.order || 0));
    await question.save();
    return res.status(201).json({ success: true, item: question });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/exams/:examId/questions/:qId', async (req, res) => {
  try {
    if (!isObjectId(req.params.qId)) {
      return res.status(400).json({ success: false, message: 'Буруу question ID формат' });
    }
    const question = await ExamQuestion.findById(req.params.qId);
    if (!question || String(question.exam_id) !== String(req.params.examId)) {
      return res.status(404).json({ success: false, message: 'Асуулт олдсонгүй' });
    }
    Object.assign(question, buildQuestionPayload(req.params.examId, { ...question.toObject?.(), ...req.body }, question.order));
    await question.save();
    return res.json({ success: true, item: question });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/exams/:examId/questions/:qId', async (req, res) => {
  try {
    if (!isObjectId(req.params.qId)) {
      return res.status(400).json({ success: false, message: 'Буруу question ID формат' });
    }
    const question = await ExamQuestion.findByIdAndDelete(req.params.qId);
    if (!question || String(question.exam_id) !== String(req.params.examId)) {
      return res.status(404).json({ success: false, message: 'Асуулт олдсонгүй' });
    }
    return res.json({ success: true, item: question });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/exams/:examId/students/:studentId/attempts/latest', async (req, res) => {
  try {
    const attempt = await ExamAttempt.findOne({
      exam_id: String(req.params.examId),
      student_id: String(req.params.studentId),
    }).sort({ createdAt: -1 });
    return res.json({ success: true, item: attempt });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/exams/:examId/students/:studentId/attempts', async (req, res) => {
  try {
    if (!isObjectId(req.params.examId)) {
      return res.status(400).json({ success: false, message: 'Буруу exam ID формат' });
    }

    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Шалгалт олдсонгүй' });

    const questions = await ExamQuestion.find({ exam_id: String(req.params.examId) }).sort({ order: 1 });
    const { checkedAnswers, gradePoint, totalPoint } = gradeAnswers(questions.map(toPlain), req.body.answers || []);
    const attempt = new ExamAttempt({
      exam_id: String(req.params.examId),
      student_id: String(req.params.studentId),
      variant_id: req.body.variant_id || '',
      started_on: normalizeDate(req.body.started_on) || new Date(),
      submitted_on: normalizeDate(req.body.submitted_on) || new Date(),
      answers: checkedAnswers,
      total_point: totalPoint,
      grade_point: gradePoint,
      status: 'graded',
    });
    await attempt.save();

    return res.status(201).json({
      success: true,
      item: attempt,
      result: buildResult(attempt, exam, questions.map(toPlain)),
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/exams/:examId/students/:studentId/result', async (req, res) => {
  try {
    const [exam, questions, attempt] = await Promise.all([
      isObjectId(req.params.examId) ? Exam.findById(req.params.examId) : null,
      ExamQuestion.find({ exam_id: String(req.params.examId) }).sort({ order: 1 }),
      ExamAttempt.findOne({
        exam_id: String(req.params.examId),
        student_id: String(req.params.studentId),
      }).sort({ createdAt: -1 }),
    ]);

    if (!exam) return res.status(404).json({ success: false, message: 'Шалгалт олдсонгүй' });
    if (!attempt) return res.status(404).json({ success: false, message: 'Шалгалтын хариу олдсонгүй' });

    return res.json({ success: true, item: buildResult(attempt, exam, questions.map(toPlain)) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
