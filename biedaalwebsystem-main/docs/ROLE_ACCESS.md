# Role Access Matrix

Энэ файл нь одоогийн frontend implementation дээр тулгуурласан эрхийн тайлбар болно.

## Test Users

- `admin@must.edu.mn` / `123` — Системийн админ
- `schooladmin@must.edu.mn` / `123` — Сургуулийн админ
- `schoolteacher@must.edu.mn` / `123` — Сургуулийн багш
- `schoolstudent@must.edu.mn` / `123` — Сургуулийн оюутан

## Shared Access

Дараах хуудсууд бүх хэрэглэгчид нээлттэй байна.

- `/`
- `/courses`
- `/courses/:course_id`
- `/courses/:course_id/lessons`
- `/courses/:course_id/lessons/:lesson_id`
- `/submissions`
- `/submissions/:submission_id`
- `/grade`
- `/statistics`
- `/attendance`
- `/groups`
- `/profile`
- `/settings`
- `/notifications`

## System Admin

Хэрэглэгч: `admin@must.edu.mn`

Хийж болно:

- Системийн бүх submission, course, grade, statistics, attendance, group мэдээлэл харах
- Хичээл үүсгэх, засах
- Хичээлийн журнал, тайлан, attendance management route-ууд руу орох
- Submission-д оноо өгөх
- Хэрэглэгчийн удирдлагын хуудсууд руу орох
- School, role, category удирдлагын route-ууд руу орох
- Question type, question level удирдах
- Course user management, question bank, exam route-ууд руу орох

Хийж болохгүй:

- Frontend дээр тусгай хориг тавигдаагүй. Одоогийн implementation-д хамгийн өргөн эрхтэй.

## School Admin

Хэрэглэгч: `schooladmin@must.edu.mn`

Хийж болно:

- Багшийн адил submission шалгах, оноо өгөх
- Хичээлүүдийн мэдээлэл харах
- Хичээл засах, course journal, attendance, groups хэсгүүдийг ашиглах
- `/users`, `/users/create`, `/users/:user_id/edit`
- `/roles`
- `/schools`, `/schools/create`, `/schools/:school_id`, `/schools/:school_id/edit`
- `/report`
- `/categories`
- `/question-types`
- `/question-levels`
- `/courses/:course_id/users`
- `/courses/:course_id/users/edit`
- `/courses/:course_id/questions*`
- `/courses/:course_id/exams*`
- `/exams*`

Хийж болохгүй:

- Frontend дээр system admin-аас ялгасан тусгай хориг одоогоор хийгдээгүй.

## Teacher

Хэрэглэгч: `schoolteacher@must.edu.mn`

Хийж болно:

- Өөрийн заадаг хичээлүүдийг харах
- Хичээлийн дэлгэрэнгүй, lessons, groups, attendance хэсгийг ашиглах
- Submission-ууд харах
- Submission дээр оноо өгөх
- `/courses/create`
- `/courses/:course_id/edit`
- `/courses/:course_id/report`
- `/courses/:course_id/grade`
- `/submissions/:submission_id/grade`
- `/course/:course_id/attendances/*`
- `/courses/:course_id/users`
- `/courses/:course_id/users/edit`
- `/courses/:course_id/questions*`
- `/courses/:course_id/exams*`
- `/exams*`

Хийж болохгүй:

- `/users`
- `/users/create`
- `/users/:user_id`
- `/users/:user_id/edit`
- `/roles`
- `/schools*`
- `/report`
- `/categories`
- `/question-types`
- `/question-levels`

UI өөрчлөгдөх зүйл:

- Sidebar дээр `Хэрэглэгчид` menu харагдахгүй
- Course detail дээр `Засах`, `Хэрэглэгчид`, `Бүлгүүд`, `Журнал` action-ууд харагдана
- Submission detail дээр `Оноо өгөх` болон `Устгах` action харагдана

## Student

Хэрэглэгч: `schoolstudent@must.edu.mn`

Хийж болно:

- Өөрийн элссэн хичээлүүдийг харах
- Lesson detail дотор `Илгээх` action ашиглах
- `/submissions/create`
- `/courses/:course_id/lessons/:lesson_id/submissions/create`
- `/submissions/:submission_id/edit`
- `/grade`
- `/statistics`
- `/attendance`
- `/groups`
- `/profile`
- `/settings`
- `/notifications`

Хийж болохгүй:

- `/courses/create`
- `/courses/:course_id/edit`
- `/courses/:course_id/report`
- `/courses/:course_id/grade`
- `/submissions/:submission_id/grade`
- `/users*`
- `/roles`
- `/schools*`
- `/report`
- `/categories`
- `/question-types`
- `/question-levels`
- `/courses/:course_id/users*`
- `/courses/:course_id/questions*`
- `/courses/:course_id/exams*`
- `/exams*`
- Attendance request management route-ууд

UI өөрчлөгдөх зүйл:

- Sidebar дээр `Илгээлт үүсгэх` menu харагдана
- Sidebar дээр `Хэрэглэгчид` menu харагдахгүй
- Course detail дээр `Миний илгээлтүүд` action харагдана
- Submission detail дээр зөвхөн өөрийн, дүн тавигдаагүй submission дээр `Засах` action гарна
- Оноо өгөх хэсэг рүү орох гэж оролдвол `Хандах эрхгүй` дэлгэц гарна

## Access Denied Behavior

Хориглосон route руу ороход frontend дараах байдлаар ажиллана.

- Хуудас хоосон болохгүй
- `Хандах эрхгүй` гэсэн тусгай дэлгэц гарна
- Одоогийн хэрэглэгчийн эрхийн нэр харагдана
- `Нүүр хуудас`, `Хичээлүүд` рүү буцах shortcut өгнө

## Note

Энэ matrix нь одоогийн frontend guard дээр суурилсан. Хэрэв backend дээр илүү нарийн эрхийн дүрэм байвал дараагийн алхамд system admin ба school admin эрхийг тусад нь илүү нарийвчилж салгаж болно.
