# LMS Backend – F.ITM301 Бие даалт 3

NodeJS + ExpressJS + MongoDB (Mongoose) ашиглан хийгдсэн backend хэсэг.

## 🚀 Ажиллуулах

### Docker ашиглан (санал болгосон)

```bash
docker-compose up --build
```

Сервер `http://localhost:3000` дээр ажиллана.

### Орон нутагт ажиллуулах

```bash
cp .env.example .env
# .env файлд MONGO_URI-гаа оруул

npm install
npm start
```

## 📋 API Endpoints

| Метод  | Зам                                           | Тайлбар                        |
|--------|-----------------------------------------------|--------------------------------|
| GET    | /health                                       | Серверийн төлөв шалгах         |
| GET    | /bs/lms/v1/lessons/:lessonId/submissions      | Хичээлийн даалгавруудыг авах   |
| POST   | /bs/lms/v1/lessons/:lessonId/submissions      | Шинэ даалгавар илгээх          |
| GET    | /bs/lms/v1/submissions/:id                    | Нэг даалгаврыг авах            |
| PUT    | /bs/lms/v1/submissions/:id                    | Даалгавар засах / оноо тавих   |
| DELETE | /bs/lms/v1/submissions/:id                    | Даалгавар устгах               |

### POST body жишээ

```json
{
  "userId": "student-001",
  "content": "Миний даалгаврын агуулга",
  "fileUrl": "https://example.com/homework.pdf",
  "comment": "Нэмэлт тайлбар"
}
```

### Оноо тавих (PUT) жишээ

```json
{
  "grade": 90,
  "gradedBy": "teacher-001"
}
```

## 🧪 Тест ажиллуулах

```bash
npm test                 # Бүх тест
npm run test:unit        # Зөвхөн unit тест
npm run test:integration # Зөвхөн integration тест
```

## 📁 Бүтэц

```
backend/
├── src/
│   ├── app.js              # Express app тохиргоо
│   ├── index.js            # Серверийг эхлүүлэх
│   ├── models/
│   │   └── Submission.js   # Mongoose загвар
│   ├── routes/
│   │   └── submissions.js  # API routes
│   └── tests/
│       ├── unit.submission.model.test.js
│       └── integration.submissions.api.test.js
├── Dockerfile
├── docker-compose.yml
├── package.json
└── .env.example
```

## 🔗 Frontend холболт

Frontend-ийн `src/services/api.js` файлд `BASE_URL`-ийг өөрчил:

```js
const BASE_URL = 'http://localhost:3000/bs/lms/v1';
```

## Шалгуур үзүүлэлт (Бие даалт 3)

- ✅ Dockerfile, docker-compose ашиглан backend + MongoDB ажиллуулах
- ✅ NodeJS + ExpressJS – submissions endpoint (GET, POST, PUT, DELETE)
- ✅ MongoDB + Mongoose – өгөгдөл хадгалах, авах
- ✅ Нэгжийн тест (unit tests) – Submission model
- ✅ Integration тест – API endpoints
- ☐ GitLab руу илгээх
