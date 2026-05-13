# Frontend Change Notes

## Yu hiisen be

Ene update-aar app-iin route butetsiig bie daalgavryn zurag deer baigaa butetstei ni oirtuulj, `team2` dotor baisan page-uudiig root-level zam ruu ajilluuldag bolgov.

## Gol oorchloltuud

### 1. Root route butets shinechilsen

- `src/App.jsx` deer `/*` route-eer undsen LMS app-iig ajilluuldag bolgoson.
- `/login`, `/register`, `/forgot-password`, `/reset-password` zamuudiig root deer gargasan.
- Huuchin `/team2/*` zamuudiig shud evdehgui bailgahyn tuld redirect oruulsan.

Holbootoi file:

- `src/App.jsx`
- `src/components/LegacyTeam2Redirect.jsx`

### 2. Assignment deer baigaa route-uudiin skeleton-g uusgesen

`src/team2/Index.jsx` deer screenshot deer gardag gol route-uudiig burtgesen.

Ajillaj baigaa esvel map hiigdsen route-uudiin jishee:

- `/`
- `/courses`
- `/courses/:course_id`
- `/courses/:course_id/lessons`
- `/courses/:course_id/lessons/:lesson_id`
- `/courses/:course_id/submissions`
- `/courses/:course_id/lessons/:lesson_id/submissions`
- `/courses/:course_id/grade`
- `/grade`
- `/course/:course_id/attendances`
- `/groups`
- `/courses/:course_id/groups`
- `/users`
- `/profile`
- `/profile/change-password`

Scaffold bolgoj oruulsan route-uudiin jishee:

- `/schools`
- `/schools/create`
- `/schools/:school_id`
- `/schools/:school_id/edit`
- `/report`
- `/roles`
- `/schools/current`
- `/categories`
- `/question-types`
- `/question-levels`
- `/courses/:course_id/question-points`
- `/courses/:course_id/questions`
- `/courses/:course_id/questions/create`
- `/courses/:course_id/questions/:question_id`
- `/courses/:course_id/questions/:question_id/edit`
- `/courses/:course_id/questions/report`
- `/courses/:course_id/exams`
- `/courses/:course_id/exams/create`
- `/exams`
- `/exams/:exam_id`
- `/exams/:exam_id/edit`
- `/exams/:exam_id/report`
- `/exams/:exam_id/variants`
- `/exams/:exam_id/variants/create`
- `/exams/:exam_id/variants/:id`
- `/exams/:exam_id/variants/:id/edit`
- `/exams/:exam_id/students/:student_id`
- `/exams/:exam_id/students/:student_id/edit`
- `/exams/:exam_id/students/:student_id/check`
- `/exams/:exam_id/students/:student_id/result`

Holbootoi file:

- `src/team2/Index.jsx`
- `src/components/RouteStubPage.jsx`

### 3. Odoo bish, harin root LMS route ruu shiljuulsen navigation

Sidebar, login, course-detail, lesson-detail, group-detail hesguudiin link-uudiig root route ruu oiruulsan.

Holbootoi file:

- `src/team2/components/Layout.jsx`
- `src/team2/pages/LoginPage.jsx`
- `src/team2/pages/courses/CourseDetailPage.jsx`
- `src/team2/pages/lessons/LessonDetailPage.jsx`
- `src/team2/pages/groups/GroupDetailPage.jsx`

### 4. Param-aar ajillah page-uud nemegdsen

Zarim huudasnuud `course_id` route param unshaad shud zov context-ooraa neegdeh bolson.

Ingesneer daraah zamuud iluu zov ajillana:

- `/courses/:course_id/grade`
- `/courses/:course_id/attendances`
- `/courses/:course_id/groups`
- `/courses/:course_id/lessons`

Holbootoi file:

- `src/team2/pages/grades/GradeReportPage.jsx`
- `src/team2/pages/attendance/AttendancePage.jsx`
- `src/team2/pages/groups/GroupsPage.jsx`
- `src/team2/pages/lessons/LessonListPage.jsx`

## Odoo huchin zamuud uldsen esehuu

Tiim. Zarim huudas dotor `"/team2/..."` hardcoded link-uud odoo ch baigaa. Gehdee ene update-aar `LegacyTeam2Redirect` nemsen tul edgeer ni tur hugatsaand evdrel uusgehgui, shine root route ruu automataar shiljij baina.

Ene ni tur zuuriin niitsliin shiidel bolhoos bish suuliin tseverlegee bish.

## Odoo scaffold gej yu ve

Scaffold route gedeg ni:

- zam ni burtgegdsan
- page ni neegddeg
- gehdee production logic ni duusaagui
- `RouteStubPage` ashiglaad "ene heseg daraa ni duusna" gesen tur page haruulj baigaa

Iim hesguuded school, role, question bank, exam module-uud bagtsan.

## Turshiltiin ur dun

Build amjilttai:

```bash
npm run build
```

## Daraagiin ajluud

1. `RouteStubPage` ashiglaj baigaa hesguudiig bodit huudas bolgoj solih.
2. Uldsen `"/team2/..."` hardcoded link-uudiig shine root route ruu bure n solih.
3. Question bank, exam, school, role hesguudiig API-tai holboj duusgah.
4. Role-based access rule-uudiig screenshot deer baigaa shaardlagatai neg mur bolgoh.
