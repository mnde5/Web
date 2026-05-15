/**
 * INTEGRATION TESTS - Payments API
 * Supertest + Jest mock ашиглан payment endpoint flow-г шалгана.
 */

const request = require('supertest');

const mockStore = {};
let idCounter = 1;

function makeId() {
  return String(idCounter++).padStart(24, '0');
}

function mockQueryMatches(item, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '_id') return String(item._id) === String(value);
    if (value && typeof value === 'object' && '$ne' in value) return item[key] !== value.$ne;
    return String(item[key]) === String(value);
  });
}

function mockMakeQuery(items) {
  return {
    sort: jest.fn().mockImplementation((sortSpec = {}) => {
      if (sortSpec.createdAt === -1) {
        return Promise.resolve([...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
      return Promise.resolve(items);
    }),
    then: (resolve, reject) => Promise.resolve(items).then(resolve, reject),
    catch: (reject) => Promise.resolve(items).catch(reject),
  };
}

class MockPaymentInstance {
  constructor(data) {
    Object.assign(this, {
      _id: makeId(),
      bank_receipt: '',
      payment_type: 'bank_transfer',
      requested_payment_method: '',
      receipt_image_url: '',
      receipt_file_name: '',
      receipt_file_type: '',
      receipt_uploaded_on: null,
      status: 'pending',
      course_count: 0,
      credits: 0,
      course_ids: [],
      courses: [],
      created_by: '',
      verified_by: '',
      verified_on: null,
      rejected_by: '',
      rejected_on: null,
      rejected_reason: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    });
  }

  async save() {
    if (!this.school_id) throw Object.assign(new Error('school_id шаардлагатай'), { name: 'ValidationError' });
    if (!this.user_id) throw Object.assign(new Error('user_id шаардлагатай'), { name: 'ValidationError' });
    if (this.amount === undefined || this.amount === null) {
      throw Object.assign(new Error('amount шаардлагатай'), { name: 'ValidationError' });
    }
    this.updatedAt = new Date();
    mockStore[this._id] = this;
    return this;
  }
}

jest.mock('../models/Payment', () => {
  const MockPayment = jest.fn().mockImplementation((data) => new MockPaymentInstance(data));
  MockPayment.find = jest.fn((query = {}) => mockMakeQuery(
    Object.values(mockStore).filter((item) => mockQueryMatches(item, query)),
  ));
  MockPayment.findOne = jest.fn((query = {}) => (
    Promise.resolve(Object.values(mockStore).find((item) => mockQueryMatches(item, query)) || null)
  ));
  return MockPayment;
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
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  idCounter = 1;
  jest.clearAllMocks();
});

describe('Payments API - Integration Tests', () => {
  test('GET / буцаах service info байна', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.apiBase).toBe(BASE);
  });

  test('POST payment үүсгээд GET payment дээр харагдана', async () => {
    const createRes = await request(app)
      .post(`${BASE}/schools/school-1/users/student-1/payments`)
      .send({
        amount: 150000,
        bank_receipt: 'QPAY-001',
        payment_date: '2026-05-14',
        payment_type: 'qpay',
        course_ids: ['course-101'],
        course_count: 1,
        credits: 3,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.item.amount).toBe(150000);
    expect(createRes.body.item.status).toBe('pending');

    const listRes = await request(app).get(`${BASE}/schools/school-1/users/student-1/payments`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.total).toBe(1);
    expect(listRes.body.items[0].bank_receipt).toBe('QPAY-001');
  });

  test('Pending payment нь debt дээр тооцогдоно', async () => {
    await request(app)
      .post(`${BASE}/schools/school-1/users/student-1/payments`)
      .send({ amount: 90000, bank_receipt: 'BANK-001' });

    const debtRes = await request(app).get(`${BASE}/schools/school-1/users/student-1/debt`);

    expect(debtRes.status).toBe(200);
    expect(debtRes.body.debt_amount).toBe(90000);
  });

  test('Admin verify хийсний дараа debt 0 болно', async () => {
    const createRes = await request(app)
      .post(`${BASE}/schools/school-1/users/student-1/payments`)
      .send({ amount: 120000, bank_receipt: 'ADMIN-001' });

    const paymentId = createRes.body.item._id;
    const verifyRes = await request(app)
      .post(`${BASE}/schools/school-1/users/student-1/payments/${paymentId}/verify`)
      .send({ current_user: 'admin-1' });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.item.status).toBe('verified');
    expect(verifyRes.body.item.verified_by).toBe('admin-1');

    const debtRes = await request(app).get(`${BASE}/schools/school-1/users/student-1/debt`);

    expect(debtRes.body.debt_amount).toBe(0);
  });

  test('Баримтын зурагтай payment үүсгээд reject хийхэд шалтгаан хадгалагдана', async () => {
    const createRes = await request(app)
      .post(`${BASE}/schools/school-1/users/student-1/payments`)
      .send({
        amount: 80000,
        bank_receipt: 'IMG-001',
        receipt_image_url: 'data:image/png;base64,ZmFrZQ==',
        receipt_file_name: 'receipt.png',
        receipt_file_type: 'image/png',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.item.receipt_image_url).toContain('data:image/png');
    expect(createRes.body.item.receipt_file_name).toBe('receipt.png');

    const rejectRes = await request(app)
      .post(`${BASE}/schools/school-1/users/student-1/payments/${createRes.body.item._id}/reject`)
      .send({ current_user: 'admin-1', reason: 'Баримтын зураг тод биш байна' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.item.status).toBe('rejected');
    expect(rejectRes.body.item.rejected_by).toBe('admin-1');
    expect(rejectRes.body.item.rejected_reason).toBe('Баримтын зураг тод биш байна');

    const debtRes = await request(app).get(`${BASE}/schools/school-1/users/student-1/debt`);
    expect(debtRes.body.debt_amount).toBe(0);
  });

  test('Debt report нь pending болон paid дүнг нэгтгэнэ', async () => {
    await request(app)
      .post(`${BASE}/schools/school-1/users/student-1/payments`)
      .send({ amount: 50000, bank_receipt: 'WAIT-001' });

    const verifiedRes = await request(app)
      .post(`${BASE}/schools/school-1/users/student-1/payments`)
      .send({ amount: 70000, bank_receipt: 'PAID-001' });

    await request(app)
      .post(`${BASE}/schools/school-1/users/student-1/payments/${verifiedRes.body.item._id}/verify`)
      .send({ current_user: 'admin-1' });

    const reportRes = await request(app).get(`${BASE}/schools/school-1/payment-debt-report`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.items).toHaveLength(1);
    expect(reportRes.body.items[0].pending_payment_amount).toBe(50000);
    expect(reportRes.body.items[0].paid_amount).toBe(70000);
    expect(reportRes.body.items[0].payment_status_name).toBe('Хүлээлт');
  });

  test('Буруу payment ID verify хийхэд 400 буцаана', async () => {
    const res = await request(app)
      .post(`${BASE}/schools/school-1/users/student-1/payments/not-valid/verify`)
      .send({ current_user: 'admin-1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
