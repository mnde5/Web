# LMS Backend - F.ITM301 Бие даалт 3

NodeJS + ExpressJS + MongoDB/Mongoose ашигласан backend хэсэг.

## Ажиллуулах

Docker ашиглан backend + MongoDB хамт асаах:

```bash
docker compose up --build -d
```

Сервер:

```text
http://localhost:3000
```

Docker log харах:

```bash
docker compose logs -f backend
```

Docker container зогсоох:

```bash
docker compose down
```

Local MongoDB ашиглаж ажиллуулах:

```bash
cp .env.example .env
npm install
npm start
```

MongoDB суулгаагүй үед memory server ашиглах:

```bash
npm run start:memory
```

## API endpoints

| Method | Path | Тайлбар |
| --- | --- | --- |
| GET | `/` | Backend service info |
| GET | `/health` | Health check |
| GET | `/bs/lms/v1/lessons/:lessonId/submissions` | Хичээлийн даалгаврууд авах |
| POST | `/bs/lms/v1/lessons/:lessonId/submissions` | Даалгавар илгээх |
| GET | `/bs/lms/v1/submissions/:id` | Нэг даалгавар авах |
| PUT | `/bs/lms/v1/submissions/:id` | Даалгавар засах, оноо тавих |
| DELETE | `/bs/lms/v1/submissions/:id` | Даалгавар устгах |
| GET | `/bs/lms/v1/schools/:schoolId/users/:userId/payments` | Оюутны төлбөрийн түүх авах |
| POST | `/bs/lms/v1/schools/:schoolId/users/:userId/payments` | Төлбөрийн хүсэлт үүсгэх, баримтын зураг хадгалах |
| POST | `/bs/lms/v1/schools/:schoolId/users/:userId/payments/:payId/verify` | Админ төлбөр баталгаажуулах |
| POST | `/bs/lms/v1/schools/:schoolId/users/:userId/payments/:payId/reject` | Админ төлбөр татгалзах, шалтгаан хадгалах |
| GET | `/bs/lms/v1/schools/:schoolId/users/:userId/debt` | Оюутны өрийн дүн авах |
| GET | `/bs/lms/v1/schools/:schoolId/payment-debt-report` | Төлбөрийн өрийн тайлан авах |
| GET | `/bs/lms/v1/exams` | Шалгалтын жагсаалт авах |
| GET | `/bs/lms/v1/courses/:courseId/exams` | Хичээлийн шалгалтууд авах |
| POST | `/bs/lms/v1/courses/:courseId/exams` | Багш шалгалт, асуулт үүсгэх |
| GET | `/bs/lms/v1/exams/:examId` | Шалгалтын дэлгэрэнгүй авах |
| PUT | `/bs/lms/v1/exams/:examId` | Шалгалтын мэдээлэл засах |
| GET | `/bs/lms/v1/exams/:examId/report` | Шалгалтын тайлан, статистик авах |
| GET | `/bs/lms/v1/exams/:examId/variants` | Шалгалтын вариантын жагсаалт авах |
| POST | `/bs/lms/v1/exams/:examId/variants` | Шалгалтын вариант нэмэх |
| GET | `/bs/lms/v1/exams/:examId/variants/:id` | Шалгалтын вариант харах |
| PUT | `/bs/lms/v1/exams/:examId/variants/:id` | Шалгалтын вариант засах |
| GET | `/bs/lms/v1/exams/:examId/questions` | Шалгалтын асуултууд авах |
| POST | `/bs/lms/v1/exams/:examId/students/:studentId/attempts` | Сурагч хариу илгээж, оноо бодуулах |
| GET | `/bs/lms/v1/exams/:examId/students/:studentId/result` | Сурагчийн шалгалтын үр дүн авах |

## Payment body жишээ

```json
{
  "amount": 150000,
  "bank_receipt": "QPAY-001",
  "payment_date": "2026-05-14",
  "payment_type": "qpay",
  "status": "pending",
  "course_count": 1,
  "credits": 3,
  "course_ids": ["course-101"],
  "receipt_image_url": "data:image/png;base64,...",
  "receipt_file_name": "receipt.png",
  "receipt_file_type": "image/png"
}
```

## Тест ажиллуулах

```bash
npm test
npm run test:unit
npm run test:integration
```

## Бүтэц

```text
backend/
├── src/
│   ├── app.js
│   ├── index.js
│   ├── dev-memory.js
│   ├── models/
│   │   ├── Exam.js
│   │   ├── ExamAttempt.js
│   │   ├── ExamQuestion.js
│   │   ├── ExamVariant.js
│   │   ├── Payment.js
│   │   └── Submission.js
│   ├── routes/
│   │   ├── exams.js
│   │   ├── payments.js
│   │   └── submissions.js
│   └── tests/
│       ├── integration.exams.api.test.js
│       ├── integration.payments.api.test.js
│       ├── integration.submissions.api.test.js
│       └── unit.submission.model.test.js
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── package.json
```

## Бие даалт 3 шалгуур

- Dockerfile, docker-compose ашиглан backend + MongoDB ажиллуулсан
- NodeJS + ExpressJS ашиглан API endpoint үүсгэсэн
- MongoDB + Mongoose ашиглан өгөгдөл хадгалж, уншиж байна
- Unit test нэмсэн
- Integration test нэмсэн
- GitHub repo руу push хийсэн
