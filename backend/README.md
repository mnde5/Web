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
| POST | `/bs/lms/v1/schools/:schoolId/users/:userId/payments` | Төлбөрийн хүсэлт үүсгэх |
| POST | `/bs/lms/v1/schools/:schoolId/users/:userId/payments/:payId/verify` | Админ төлбөр баталгаажуулах |
| GET | `/bs/lms/v1/schools/:schoolId/users/:userId/debt` | Оюутны өрийн дүн авах |
| GET | `/bs/lms/v1/schools/:schoolId/payment-debt-report` | Төлбөрийн өрийн тайлан авах |

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
  "course_ids": ["course-101"]
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
│   │   ├── Payment.js
│   │   └── Submission.js
│   ├── routes/
│   │   ├── payments.js
│   │   └── submissions.js
│   └── tests/
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
