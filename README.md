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
| POST | `/bs/lms/v1/schools/:schoolId/users/:userId/payments` | Оюутны төлбөрийн хүсэлт үүсгэх, баримтын зураг хадгалах |
| POST | `/bs/lms/v1/schools/:schoolId/users/:userId/payments/:payId/verify` | Сургуулийн админ төлбөр баталгаажуулах |
| POST | `/bs/lms/v1/schools/:schoolId/users/:userId/payments/:payId/reject` | Сургуулийн админ төлбөр татгалзах, шалтгаан хадгалах |
| GET | `/bs/lms/v1/schools/:schoolId/users/:userId/debt` | Оюутны өрийн дүн авах |
| GET | `/bs/lms/v1/schools/:schoolId/payment-debt-report` | Сургуулийн төлбөрийн тайлан авах |

Exams:

Шалгалтын хэсэг нь local backend (`http://localhost:3000/bs/lms/v1`) дээр ажиллаж, MongoDB-д шалгалт, асуулт, сурагчийн илгээсэн хариултыг хадгална.

| Method | Path | Тайлбар |
| --- | --- | --- |
| GET | `/bs/lms/v1/exams` | Нийт шалгалтын жагсаалт авах |
| GET | `/bs/lms/v1/courses/:courseId/exams` | Тухайн хичээлийн шалгалтууд авах |
| GET | `/bs/lms/v1/schools/:schoolId/exams` | Тухайн сургуулийн шалгалтууд авах |
| POST | `/bs/lms/v1/courses/:courseId/exams` | Багш шинэ шалгалт үүсгэх |
| GET | `/bs/lms/v1/exams/:examId` | Шалгалтын дэлгэрэнгүй мэдээлэл авах |
| PUT | `/bs/lms/v1/exams/:examId` | Шалгалтын мэдээлэл засах |
| DELETE | `/bs/lms/v1/exams/:examId` | Шалгалт устгах |
| GET | `/bs/lms/v1/exams/:examId/report` | Шалгалтын тайлан, статистик авах |
| GET | `/bs/lms/v1/exams/:examId/variants` | Шалгалтын вариантын жагсаалт авах |
| POST | `/bs/lms/v1/exams/:examId/variants` | Шалгалтын вариант нэмэх |
| GET | `/bs/lms/v1/exams/:examId/variants/:id` | Шалгалтын вариант харах |
| PUT | `/bs/lms/v1/exams/:examId/variants/:id` | Шалгалтын вариант засах |
| GET | `/bs/lms/v1/exams/:examId/questions` | Шалгалтын асуултууд авах |
| POST | `/bs/lms/v1/exams/:examId/questions` | Шалгалтад асуулт нэмэх |
| PUT | `/bs/lms/v1/exams/:examId/questions/:qId` | Шалгалтын асуулт засах |
| DELETE | `/bs/lms/v1/exams/:examId/questions/:qId` | Шалгалтын асуулт устгах |
| POST | `/bs/lms/v1/exams/:examId/students/:studentId/attempts` | Сурагч шалгалтын хариу илгээх, автоматаар оноо бодох |
| GET | `/bs/lms/v1/exams/:examId/students/:studentId/result` | Сурагчийн шалгалтын үр дүн авах |

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
  "course_ids": ["course-101"],
  "receipt_image_url": "data:image/png;base64,...",
  "receipt_file_name": "receipt.png",
  "receipt_file_type": "image/png"
}
```

## Багш шалгалт үүсгэх хэсэг

Frontend route:

| Route | Хэрэглээ |
| --- | --- |
| `/courses/:course_id/exams` | Хичээлийн шалгалтын жагсаалт |
| `/courses/:course_id/exams/create` | Багш шинэ шалгалт үүсгэх |
| `/exams/:exam_id` | Шалгалтын дэлгэрэнгүй |
| `/exams/:exam_id/edit` | Шалгалтын мэдээлэл, асуулт засах |
| `/exams/:exam_id/report` | Шалгалтын тайлан, статистик харах |
| `/exams/:exam_id/variants` | Шалгалтын вариантын жагсаалт |
| `/exams/:exam_id/variants/create` | Шалгалтын вариант нэмэх |
| `/exams/:exam_id/variants/:id` | Шалгалтын вариант харах |
| `/exams/:exam_id/variants/:id/edit` | Шалгалтын вариант засах |
| `/exams/:exam_id/students/:student_id` | Сурагчийн горимоор шалгалт өгөх |
| `/exams/:exam_id/students/:student_id/result` | Шалгалтын үр дүн харах |

Багш шалгалт үүсгэх API жишээ:

```bash
curl -X POST http://localhost:3000/bs/lms/v1/courses/course-101/exams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Явцын шалгалт 1",
    "description": "React үндсэн ойлголтын шалгалт",
    "duration": 60,
    "total_point": 100,
    "starts_on": "2026-05-15T09:00:00.000Z",
    "ends_on": "2026-05-15T12:00:00.000Z",
    "status": "published",
    "current_user": "teacher-1",
    "questions": [
      {
        "question": "React component гэж юу вэ?",
        "type": "single_choice",
        "point": 5,
        "answers": [
          { "text": "UI-ийн дахин ашиглагдах хэсэг", "is_correct": true },
          { "text": "Database table", "is_correct": false }
        ]
      }
    ]
  }'
```

Шалгалтад асуулт нэмэх API жишээ:

```bash
curl -X POST http://localhost:3000/bs/lms/v1/exams/<examId>/questions \
  -H "Content-Type: application/json" \
  -d '{
    "question": "React component гэж юу вэ?",
    "type": "single_choice",
    "point": 5,
    "answers": [
      { "text": "UI-ийн дахин ашиглагдах хэсэг", "is_correct": true },
      { "text": "Database table", "is_correct": false },
      { "text": "HTTP method", "is_correct": false }
    ]
  }'
```

## Сурагч шалгалт өгөх хэсэг

Frontend route:

| Route | Хэрэглээ |
| --- | --- |
| `/exams/:exam_id/students/:student_id` | Сурагч шалгалт эхлүүлэх |
| `/exams/:exam_id/students/:student_id/edit` | Шалгалт үргэлжлүүлэх, хариулт засах |
| `/exams/:exam_id/students/:student_id/check` | Зөв хариулт харах |
| `/exams/:exam_id/students/:student_id/result` | Шалгалтын үр дүн харах |

Сурагч шалгалтын мэдээлэл авах API жишээ:

```bash
curl http://localhost:3000/bs/lms/v1/exams/<examId>
```

Сурагч шалгалтын асуултууд авах API жишээ:

```bash
curl http://localhost:3000/bs/lms/v1/exams/<examId>/questions
```

Сурагч шалгалтын хариулт илгээх API жишээ:

```bash
curl -X POST http://localhost:3000/bs/lms/v1/exams/<examId>/students/student-1/attempts \
  -H "Content-Type: application/json" \
  -d '{
    "started_on": "2026-05-15T09:05:00.000Z",
    "submitted_on": "2026-05-15T09:45:00.000Z",
    "answers": [
      {
        "question_id": "<questionId>",
        "answer_id": "a1",
        "answer_text": "UI-ийн дахин ашиглагдах хэсэг"
      }
    ]
  }'
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
  -d '{"amount":150000,"bank_receipt":"QPAY-001","payment_type":"qpay","course_ids":["course-101"],"receipt_image_url":"data:image/png;base64,...","receipt_file_name":"receipt.png"}'
```

```bash
curl -X POST http://localhost:3000/bs/lms/v1/schools/school-1/users/student-1/payments/<paymentId>/reject \
  -H "Content-Type: application/json" \
  -d '{"current_user":"admin-1","reason":"Баримтын зураг тод биш байна"}'
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
