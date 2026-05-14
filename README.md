# LMS Web System

F.ITM301 бие даалтын LMS web system. Frontend нь React + Vite, backend нь NodeJS + ExpressJS + MongoDB/Mongoose ашигласан.

## Project бүтэц

```text
WEBWEBWEB/
├── backend/                 # Express + MongoDB backend
└── biedaalwebsystem-main/   # React + Vite frontend
```

## Ашигласан технологи

- Frontend: React 18, Vite, React Router, Tailwind CSS
- Backend: NodeJS, ExpressJS
- Database: MongoDB, Mongoose
- Test: Jest, Supertest
- Container: Dockerfile, Docker Compose

## Frontend ажиллуулах

```bash
cd biedaalwebsystem-main
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

Frontend build шалгах:

```bash
npm run build
```

## Backend ажиллуулах

MongoDB local дээр ажиллаж байгаа үед:

```bash
cd backend
npm install
npm start
```

Backend URL:

```text
http://localhost:3000
```

MongoDB суулгаагүй үед memory server ашиглаж болно:

```bash
cd backend
npm run start:memory
```

## Docker ашиглаж ажиллуулах

Backend болон MongoDB-г хамт асаах:

```bash
cd backend
docker compose up --build -d
```

Хэрвээ Mac terminal дээр `docker` command олдохгүй бол:

```bash
/Applications/Docker.app/Contents/Resources/bin/docker compose up --build -d
```

Container status харах:

```bash
docker compose ps
```

Backend log харах:

```bash
docker compose logs -f backend
```

Зогсоох:

```bash
docker compose down
```

## API endpoint-үүд

Base URL:

```text
http://localhost:3000/bs/lms/v1
```

System:

| Method | Path | Тайлбар |
| --- | --- | --- |
| GET | `/` | Backend service info |
| GET | `/health` | Backend health check |

Submissions:

| Method | Path | Тайлбар |
| --- | --- | --- |
| GET | `/bs/lms/v1/lessons/:lessonId/submissions` | Хичээлийн даалгаврын жагсаалт авах |
| POST | `/bs/lms/v1/lessons/:lessonId/submissions` | Оюутан даалгавар илгээх |
| GET | `/bs/lms/v1/submissions/:id` | Нэг даалгавар харах |
| PUT | `/bs/lms/v1/submissions/:id` | Даалгавар засах, оноо тавих |
| DELETE | `/bs/lms/v1/submissions/:id` | Даалгавар устгах |

Payments:

| Method | Path | Тайлбар |
| --- | --- | --- |
| GET | `/bs/lms/v1/schools/:schoolId/users/:userId/payments` | Оюутны төлбөрийн түүх авах |
| POST | `/bs/lms/v1/schools/:schoolId/users/:userId/payments` | Оюутны төлбөрийн хүсэлт үүсгэх |
| POST | `/bs/lms/v1/schools/:schoolId/users/:userId/payments/:payId/verify` | Сургуулийн админ төлбөр баталгаажуулах |
| GET | `/bs/lms/v1/schools/:schoolId/users/:userId/debt` | Оюутны өрийн дүн авах |
| GET | `/bs/lms/v1/schools/:schoolId/payment-debt-report` | Сургуулийн төлбөрийн тайлан авах |

Payment үүсгэх body жишээ:

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

## API шалгах curl команд

Health:

```bash
curl http://localhost:3000/health
```

Payment list:

```bash
curl http://localhost:3000/bs/lms/v1/schools/school-1/users/student-1/payments
```

Payment create:

```bash
curl -X POST http://localhost:3000/bs/lms/v1/schools/school-1/users/student-1/payments \
  -H "Content-Type: application/json" \
  -d '{"amount":150000,"bank_receipt":"QPAY-001","payment_type":"qpay","course_ids":["course-101"]}'
```

## Test ажиллуулах

```bash
cd backend
npm test
```

Unit test:

```bash
npm run test:unit
```

Integration test:

```bash
npm run test:integration
```

## Бие даалт 3 шалгуур

- Dockerfile, docker-compose ашиглан backend + MongoDB ажиллуулсан
- NodeJS, ExpressJS ашиглан API endpoint үүсгэсэн
- MongoDB, Mongoose ашиглан payment/submission өгөгдөл хадгалж, уншиж байна
- Unit test нэмсэн
- Integration test нэмсэн
- GitHub repo руу код push хийсэн
