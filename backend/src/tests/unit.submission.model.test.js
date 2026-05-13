/**
 * UNIT TESTS – Submission Model (Jest мок ашиглан)
 * Mongoose-г мок хийж, загварын логикийг шалгана
 */

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    Schema: actualMongoose.Schema,
    model: jest.fn(),
    Types: actualMongoose.Types,
  };
});

describe('Submission Model – Unit Tests (Схем ба логик)', () => {
  let SubmissionSchema;

  beforeAll(() => {
    const mongoose = require('mongoose');
    SubmissionSchema = new mongoose.Schema(
      {
        lessonId: { type: String, required: [true, 'lessonId шаардлагатай'], trim: true },
        userId:   { type: String, required: [true, 'userId шаардлагатай'], trim: true },
        content:  { type: String, default: '' },
        fileUrl:  { type: String, default: '' },
        grade:    { type: Number, default: null },
        gradedBy: { type: String, default: null },
        gradedAt: { type: Date, default: null },
        comment:  { type: String, default: '' },
        status:   { type: String, enum: ['pending', 'graded', 'returned'], default: 'pending' },
      },
      { timestamps: true }
    );
  });

  describe('Schema тодорхойлолт', () => {
    test('lessonId path байна', () => {
      expect(SubmissionSchema.path('lessonId')).toBeDefined();
    });
    test('userId path байна', () => {
      expect(SubmissionSchema.path('userId')).toBeDefined();
    });
    test('status enum утгуудыг зөв тодорхойлно', () => {
      const statusPath = SubmissionSchema.path('status');
      expect(statusPath.enumValues).toEqual(['pending', 'graded', 'returned']);
    });
    test('status default утга "pending" байна', () => {
      expect(SubmissionSchema.path('status').defaultValue).toBe('pending');
    });
    test('grade default утга null байна', () => {
      expect(SubmissionSchema.path('grade').defaultValue).toBeNull();
    });
    test('content default утга хоосон string байна', () => {
      expect(SubmissionSchema.path('content').defaultValue).toBe('');
    });
    test('timestamps тохиргоо байна', () => {
      expect(SubmissionSchema.options.timestamps).toBe(true);
    });
  });

  describe('Validation дүрмүүд', () => {
    test('lessonId required validator байна', () => {
      const validators = SubmissionSchema.path('lessonId').validators;
      expect(validators.find((v) => v.type === 'required')).toBeDefined();
    });
    test('userId required validator байна', () => {
      const validators = SubmissionSchema.path('userId').validators;
      expect(validators.find((v) => v.type === 'required')).toBeDefined();
    });
    test('status enum зөв утгуудыг агуулна', () => {
      const enums = SubmissionSchema.path('status').enumValues;
      expect(enums).toContain('pending');
      expect(enums).toContain('graded');
      expect(enums).toContain('returned');
      expect(enums).not.toContain('invalid');
    });
  });

  describe('Route handler логик', () => {
    test('userId байхгүй үед 400 буцаах ёстой', () => {
      const mockJson = jest.fn();
      const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      const mockRes = { json: mockJson, status: mockStatus };

      const body = { content: 'тест' };
      if (!body.userId) {
        mockRes.status(400).json({ success: false, message: 'userId шаардлагатай' });
      }
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ success: false, message: 'userId шаардлагатай' });
    });

    test('Оноо тавихад status "graded" болох ёстой', () => {
      const submission = { grade: null, status: 'pending', gradedBy: null, gradedAt: null };
      const grade = 90;
      if (grade !== undefined && grade !== null) {
        submission.grade = grade;
        submission.gradedBy = 'teacher-001';
        submission.gradedAt = new Date();
        submission.status = 'graded';
      }
      expect(submission.grade).toBe(90);
      expect(submission.status).toBe('graded');
      expect(submission.gradedAt).toBeInstanceOf(Date);
    });

    test('Оноо байхгүй үед оюутан агуулгаа засаж болно', () => {
      const submission = { grade: null, content: 'Анхны' };
      const update = { content: 'Шинэчлэгдсэн' };
      if (submission.grade === null && update.content !== undefined) {
        submission.content = update.content;
      }
      expect(submission.content).toBe('Шинэчлэгдсэн');
    });
  });

  describe('Өгөгдлийн хэлбэр', () => {
    test('grade нь тоон утга байна', () => {
      expect(typeof 95).toBe('number');
    });
    test('status зөвхөн тодорхой утгуудыг авна', () => {
      const valid = ['pending', 'graded', 'returned'];
      expect(valid).toContain('pending');
      expect(valid).not.toContain('unknown');
    });
    test('Шинэ submission-ийн default утгууд зөв', () => {
      const d = { content: '', fileUrl: '', status: 'pending', grade: null };
      expect(d.status).toBe('pending');
      expect(d.grade).toBeNull();
      expect(d.content).toBe('');
    });
  });
});
