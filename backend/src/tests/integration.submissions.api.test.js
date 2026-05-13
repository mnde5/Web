/**
 * INTEGRATION TESTS – Submissions API
 * Supertest + Jest мок ашиглан HTTP endpoint-уудыг шалгана
 */

const request = require('supertest');

// ── Mongoose mock ────────────────────────────────────────────
// In-memory store
const store = {};
let idCounter = 1;

function makeId() {
  return String(idCounter++).padStart(24, '0');
}

const mockSubmission = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
};

// Save method for instances
class MockSubmissionInstance {
  constructor(data) {
    Object.assign(this, { content: '', fileUrl: '', comment: '', status: 'pending',
      grade: null, gradedBy: null, gradedAt: null, ...data });
    if (!this._id) this._id = makeId();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
  async save() {
    if (!this.lessonId) throw Object.assign(new Error('lessonId шаардлагатай'), { name: 'ValidationError' });
    if (!this.userId)   throw Object.assign(new Error('userId шаардлагатай'),   { name: 'ValidationError' });
    store[this._id] = { ...this };
    return this;
  }
}

jest.mock('../models/Submission', () => {
  const MockClass = jest.fn().mockImplementation((data) => new MockSubmissionInstance(data));
  MockClass.find = jest.fn();
  MockClass.findById = jest.fn();
  MockClass.findByIdAndDelete = jest.fn();
  MockClass.countDocuments = jest.fn();
  MockClass.create = jest.fn();
  MockClass.deleteMany = jest.fn();
  return MockClass;
});

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
  Schema: jest.fn(),
  model: jest.fn(),
  Types: { ObjectId: { isValid: (id) => /^[0-9a-fA-F]{24}$/.test(id) } },
}));

const app = require('../app');
const Submission = require('../models/Submission');

const BASE = '/bs/lms/v1';

// Helper: build a fake saved submission
function fakeSub(overrides = {}) {
  const id = makeId();
  return { _id: id, lessonId: 'l1', userId: 'u1', content: '', fileUrl: '',
    comment: '', status: 'pending', grade: null, gradedBy: null, gradedAt: null,
    createdAt: new Date(), updatedAt: new Date(), ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Submissions API – Integration Tests', () => {
  // ── Health ──────────────────────────────────────────────
  describe('GET /health', () => {
    test('200 буцааж, status ok байна', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // ── GET /lessons/:lessonId/submissions ──────────────────
  describe('GET /lessons/:lessonId/submissions', () => {
    test('Хоосон жагсаалт буцаана', async () => {
      Submission.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
      const res = await request(app).get(`${BASE}/lessons/lesson-001/submissions`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    test('Тухайн хичээлийн submissions буцаана', async () => {
      const subs = [fakeSub({ lessonId: 'lesson-001' }), fakeSub({ lessonId: 'lesson-001', userId: 'u2' })];
      Submission.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(subs) });
      const res = await request(app).get(`${BASE}/lessons/lesson-001/submissions`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
    });

    test('userId query параметрээр шүүнэ', async () => {
      const subs = [fakeSub({ lessonId: 'lesson-001', userId: 'u1' })];
      Submission.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(subs) });
      const res = await request(app).get(`${BASE}/lessons/lesson-001/submissions?userId=u1`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      // find дуудагдсан filter-ийг шалгана
      expect(Submission.find).toHaveBeenCalledWith({ lessonId: 'lesson-001', userId: 'u1' });
    });
  });

  // ── POST /lessons/:lessonId/submissions ─────────────────
  describe('POST /lessons/:lessonId/submissions', () => {
    test('Шинэ submission амжилттай үүснэ', async () => {
      // Constructor-ийн instance save() хийдэг тул зориулалтын mock
      const saved = fakeSub({ lessonId: 'lesson-001', userId: 'student-001', content: 'агуулга' });
      Submission.mockImplementationOnce(() => ({
        ...saved,
        save: jest.fn().mockResolvedValue(saved),
      }));
      const res = await request(app)
        .post(`${BASE}/lessons/lesson-001/submissions`)
        .send({ userId: 'student-001', content: 'агуулга' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('userId байхгүй үед 400 буцаана', async () => {
      const res = await request(app)
        .post(`${BASE}/lessons/lesson-001/submissions`)
        .send({ content: 'агуулга' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('Хоосон body үед 400 буцаана', async () => {
      const res = await request(app)
        .post(`${BASE}/lessons/lesson-001/submissions`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ── GET /submissions/:id ────────────────────────────────
  describe('GET /submissions/:id', () => {
    test('ID-аар submission авна', async () => {
      const sub = fakeSub();
      Submission.findById.mockResolvedValue(sub);
      const res = await request(app).get(`${BASE}/submissions/${sub._id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.item._id).toBe(sub._id);
    });

    test('Олдохгүй ID-д 404 буцаана', async () => {
      Submission.findById.mockResolvedValue(null);
      const fakeId = makeId();
      const res = await request(app).get(`${BASE}/submissions/${fakeId}`);
      expect(res.status).toBe(404);
    });

    test('Буруу ID форматад 400 буцаана', async () => {
      const castErr = new Error('Cast error');
      castErr.name = 'CastError';
      Submission.findById.mockRejectedValue(castErr);
      const res = await request(app).get(`${BASE}/submissions/not-valid`);
      expect(res.status).toBe(400);
    });
  });

  // ── PUT /submissions/:id ────────────────────────────────
  describe('PUT /submissions/:id', () => {
    test('Оюутан агуулгаа засаж болно', async () => {
      const sub = fakeSub({ content: 'Анхны' });
      const updated = { ...sub, content: 'Шинэчлэгдсэн', save: jest.fn().mockResolvedValue(true) };
      Submission.findById.mockResolvedValue(updated);
      const res = await request(app)
        .put(`${BASE}/submissions/${sub._id}`)
        .send({ content: 'Шинэчлэгдсэн' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Багш оноо тавьж болно', async () => {
      const sub = fakeSub();
      const subWithSave = {
        ...sub,
        save: jest.fn().mockImplementation(function() { return Promise.resolve(this); }),
      };
      Submission.findById.mockResolvedValue(subWithSave);
      const res = await request(app)
        .put(`${BASE}/submissions/${sub._id}`)
        .send({ grade: 88, gradedBy: 'teacher-001' });
      expect(res.status).toBe(200);
      expect(subWithSave.grade).toBe(88);
      expect(subWithSave.status).toBe('graded');
    });

    test('Олдохгүй ID-д 404 буцаана', async () => {
      Submission.findById.mockResolvedValue(null);
      const fakeId = makeId();
      const res = await request(app).put(`${BASE}/submissions/${fakeId}`).send({ content: 'x' });
      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /submissions/:id ─────────────────────────────
  describe('DELETE /submissions/:id', () => {
    test('Submission амжилттай устна', async () => {
      const sub = fakeSub();
      Submission.findByIdAndDelete.mockResolvedValue(sub);
      const res = await request(app).delete(`${BASE}/submissions/${sub._id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Олдохгүй ID-д 404 буцаана', async () => {
      Submission.findByIdAndDelete.mockResolvedValue(null);
      const fakeId = makeId();
      const res = await request(app).delete(`${BASE}/submissions/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  // ── 404 handler ─────────────────────────────────────────
  describe('404 handler', () => {
    test('Бүртгэлгүй route-д 404 буцаана', async () => {
      const res = await request(app).get('/bs/lms/v1/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
