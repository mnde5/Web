/**
 * INTEGRATION TESTS - Exams API
 * Багш шалгалт үүсгэх, сурагч шалгалт өгөх endpoint flow-г шалгана.
 */

const request = require('supertest');

const mockExamStore = {};
const mockQuestionStore = {};
const mockAttemptStore = {};
const mockVariantStore = {};
let mockIdCounter = 1;

function mockMakeId() {
  return String(mockIdCounter++).padStart(24, '0');
}

function mockMatches(item, query = {}) {
  return Object.entries(query).every(([key, value]) => String(item[key]) === String(value));
}

function mockMakeQuery(items) {
  return {
    sort: jest.fn().mockImplementation((sortSpec = {}) => {
      const sorted = [...items].sort((a, b) => {
        if (sortSpec.order === 1) return Number(a.order || 0) - Number(b.order || 0);
        if (sortSpec.createdAt === -1) return new Date(b.createdAt) - new Date(a.createdAt);
        return 0;
      });
      return Promise.resolve(sorted);
    }),
    then: (resolve, reject) => Promise.resolve(items).then(resolve, reject),
    catch: (reject) => Promise.resolve(items).catch(reject),
  };
}

function mockMakeFindOneQuery(items) {
  return {
    sort: jest.fn().mockImplementation((sortSpec = {}) => {
      const sorted = [...items].sort((a, b) => {
        if (sortSpec.createdAt === -1) return new Date(b.createdAt) - new Date(a.createdAt);
        return 0;
      });
      return Promise.resolve(sorted[0] || null);
    }),
    then: (resolve, reject) => Promise.resolve(items[0] || null).then(resolve, reject),
    catch: (reject) => Promise.resolve(items[0] || null).catch(reject),
  };
}

class MockDoc {
  constructor(data) {
    Object.assign(this, {
      _id: mockMakeId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    });
  }

  get id() {
    return String(this._id);
  }

  toJSON() {
    return {
      ...this,
      id: this.id,
      created_on: this.createdAt,
      updated_on: this.updatedAt,
      _id: undefined,
      __v: undefined,
    };
  }

  toObject() {
    return { ...this };
  }
}

class MockExamInstance extends MockDoc {
  constructor(data) {
    super({
      school_id: '',
      description: '',
      duration: 60,
      total_point: 0,
      starts_on: null,
      ends_on: null,
      status: 'draft',
      created_by: '',
      ...data,
    });
  }

  async save() {
    if (!this.course_id) throw Object.assign(new Error('course_id шаардлагатай'), { name: 'ValidationError' });
    if (!this.name) throw Object.assign(new Error('name шаардлагатай'), { name: 'ValidationError' });
    this.updatedAt = new Date();
    mockExamStore[this.id] = this;
    return this;
  }
}

class MockQuestionInstance extends MockDoc {
  constructor(data) {
    super({
      type: 'single_choice',
      point: 1,
      order: 0,
      answers: [],
      ...data,
    });
  }

  async save() {
    if (!this.exam_id) throw Object.assign(new Error('exam_id шаардлагатай'), { name: 'ValidationError' });
    if (!this.question) throw Object.assign(new Error('question шаардлагатай'), { name: 'ValidationError' });
    this.updatedAt = new Date();
    mockQuestionStore[this.id] = this;
    return this;
  }
}

class MockAttemptInstance extends MockDoc {
  constructor(data) {
    super({
      variant_id: '',
      answers: [],
      total_point: 0,
      grade_point: 0,
      status: 'submitted',
      ...data,
    });
  }

  async save() {
    if (!this.exam_id) throw Object.assign(new Error('exam_id шаардлагатай'), { name: 'ValidationError' });
    if (!this.student_id) throw Object.assign(new Error('student_id шаардлагатай'), { name: 'ValidationError' });
    this.updatedAt = new Date();
    mockAttemptStore[this.id] = this;
    return this;
  }
}

class MockVariantInstance extends MockDoc {
  constructor(data) {
    super({
      description: '',
      question_ids: [],
      order: 0,
      status: 'published',
      created_by: '',
      ...data,
    });
  }

  async save() {
    if (!this.exam_id) throw Object.assign(new Error('exam_id шаардлагатай'), { name: 'ValidationError' });
    if (!this.name) throw Object.assign(new Error('name шаардлагатай'), { name: 'ValidationError' });
    this.updatedAt = new Date();
    mockVariantStore[this.id] = this;
    return this;
  }
}

jest.mock('../models/Exam', () => {
  const MockExam = jest.fn().mockImplementation((data) => new MockExamInstance(data));
  MockExam.find = jest.fn((query = {}) => mockMakeQuery(Object.values(mockExamStore).filter((item) => mockMatches(item, query))));
  MockExam.findById = jest.fn((id) => Promise.resolve(mockExamStore[String(id)] || null));
  MockExam.findByIdAndDelete = jest.fn((id) => {
    const item = mockExamStore[String(id)] || null;
    delete mockExamStore[String(id)];
    return Promise.resolve(item);
  });
  return MockExam;
});

jest.mock('../models/ExamQuestion', () => {
  const MockQuestion = jest.fn().mockImplementation((data) => new MockQuestionInstance(data));
  MockQuestion.find = jest.fn((query = {}) => mockMakeQuery(Object.values(mockQuestionStore).filter((item) => mockMatches(item, query))));
  MockQuestion.findById = jest.fn((id) => Promise.resolve(mockQuestionStore[String(id)] || null));
  MockQuestion.findByIdAndDelete = jest.fn((id) => {
    const item = mockQuestionStore[String(id)] || null;
    delete mockQuestionStore[String(id)];
    return Promise.resolve(item);
  });
  MockQuestion.deleteMany = jest.fn((query = {}) => {
    Object.entries(mockQuestionStore).forEach(([id, item]) => {
      if (mockMatches(item, query)) delete mockQuestionStore[id];
    });
    return Promise.resolve({ deletedCount: 1 });
  });
  return MockQuestion;
});

jest.mock('../models/ExamAttempt', () => {
  const MockAttempt = jest.fn().mockImplementation((data) => new MockAttemptInstance(data));
  MockAttempt.find = jest.fn((query = {}) => mockMakeQuery(Object.values(mockAttemptStore).filter((item) => mockMatches(item, query))));
  MockAttempt.findOne = jest.fn((query = {}) => mockMakeFindOneQuery(Object.values(mockAttemptStore).filter((item) => mockMatches(item, query))));
  return MockAttempt;
});

jest.mock('../models/ExamVariant', () => {
  const MockVariant = jest.fn().mockImplementation((data) => new MockVariantInstance(data));
  MockVariant.find = jest.fn((query = {}) => mockMakeQuery(Object.values(mockVariantStore).filter((item) => mockMatches(item, query))));
  MockVariant.findById = jest.fn((id) => Promise.resolve(mockVariantStore[String(id)] || null));
  MockVariant.deleteMany = jest.fn((query = {}) => {
    Object.entries(mockVariantStore).forEach(([id, item]) => {
      if (mockMatches(item, query)) delete mockVariantStore[id];
    });
    return Promise.resolve({ deletedCount: 1 });
  });
  return MockVariant;
});

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
  };
});

const app = require('../app');

const BASE = '/bs/lms/v1';

beforeEach(() => {
  Object.keys(mockExamStore).forEach((key) => delete mockExamStore[key]);
  Object.keys(mockQuestionStore).forEach((key) => delete mockQuestionStore[key]);
  Object.keys(mockAttemptStore).forEach((key) => delete mockAttemptStore[key]);
  Object.keys(mockVariantStore).forEach((key) => delete mockVariantStore[key]);
  mockIdCounter = 1;
  jest.clearAllMocks();
});

describe('Exams API - Integration Tests', () => {
  test('Багш шалгалт үүсгээд сурагч өгч, оноо авна', async () => {
    const createRes = await request(app)
      .post(`${BASE}/courses/course-101/exams`)
      .send({
        name: 'Явцын шалгалт 1',
        status: 'published',
        duration: 30,
        total_point: 10,
        questions: [
          {
            question: 'HTTP GET method юу хийдэг вэ?',
            point: 5,
            answers: [
              { text: 'Өгөгдөл авах', is_correct: true },
              { text: 'Өгөгдөл устгах', is_correct: false },
            ],
          },
          {
            question: 'MongoDB ямар төрлийн database вэ?',
            point: 5,
            answers: [
              { text: 'NoSQL', is_correct: true },
              { text: 'CSS framework', is_correct: false },
            ],
          },
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.item.name).toBe('Явцын шалгалт 1');
    expect(createRes.body.questions).toHaveLength(2);

    const examId = createRes.body.item.id;
    const questionOneId = createRes.body.questions[0].id;
    const questionTwoId = createRes.body.questions[1].id;

    const listRes = await request(app).get(`${BASE}/courses/course-101/exams`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(1);

    const questionsRes = await request(app).get(`${BASE}/exams/${examId}/questions`);
    expect(questionsRes.status).toBe(200);
    expect(questionsRes.body.total).toBe(2);

    const attemptRes = await request(app)
      .post(`${BASE}/exams/${examId}/students/student-1/attempts`)
      .send({
        answers: [
          { question_id: questionOneId, answer_id: 'a1', answer_text: 'Өгөгдөл авах' },
          { question_id: questionTwoId, answer_id: 'a2', answer_text: 'CSS framework' },
        ],
      });

    expect(attemptRes.status).toBe(201);
    expect(attemptRes.body.item.total_point).toBe(10);
    expect(attemptRes.body.item.grade_point).toBe(5);
    expect(attemptRes.body.result.questions[0].selected_answer.is_correct).toBe(true);
    expect(attemptRes.body.result.questions[1].selected_answer.is_correct).toBe(false);

    const resultRes = await request(app).get(`${BASE}/exams/${examId}/students/student-1/result`);
    expect(resultRes.status).toBe(200);
    expect(resultRes.body.item.attempt.grade_point).toBe(5);

    const variantRes = await request(app)
      .post(`${BASE}/exams/${examId}/variants`)
      .send({
        name: 'A вариант',
        description: 'Эхний хувилбар',
        question_ids: [questionOneId, questionTwoId],
      });

    expect(variantRes.status).toBe(201);
    expect(variantRes.body.item.name).toBe('A вариант');
    expect(variantRes.body.item.question_ids).toEqual([questionOneId, questionTwoId]);

    const variantId = variantRes.body.item.id;
    const variantsListRes = await request(app).get(`${BASE}/exams/${examId}/variants`);
    expect(variantsListRes.status).toBe(200);
    expect(variantsListRes.body.total).toBe(1);

    const variantDetailRes = await request(app).get(`${BASE}/exams/${examId}/variants/${variantId}`);
    expect(variantDetailRes.status).toBe(200);
    expect(variantDetailRes.body.item.description).toBe('Эхний хувилбар');

    const variantUpdateRes = await request(app)
      .put(`${BASE}/exams/${examId}/variants/${variantId}`)
      .send({ name: 'B вариант', question_ids: [questionOneId] });

    expect(variantUpdateRes.status).toBe(200);
    expect(variantUpdateRes.body.item.name).toBe('B вариант');
    expect(variantUpdateRes.body.item.question_ids).toEqual([questionOneId]);

    const reportRes = await request(app).get(`${BASE}/exams/${examId}/report`);
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.item.attempt_count).toBe(1);
    expect(reportRes.body.item.variant_count).toBe(1);
    expect(reportRes.body.item.average_score).toBe(5);
    expect(reportRes.body.item.question_stats).toHaveLength(2);
  });

  test('Нэргүй шалгалт үүсгэхэд 400 буцаана', async () => {
    const res = await request(app)
      .post(`${BASE}/courses/course-101/exams`)
      .send({ duration: 20 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
