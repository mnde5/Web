import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAccess from './components/RequireAccess';
import RouteStubPage from './components/RouteStubPage';
import {
  canGrade,
  canManageCourseUsers,
  canManageUsers,
  canManagePayments,
  canSubmit,
} from './utils/role';

import DashboardPage          from './pages/DashboardPage';
import CoursesPage            from './pages/courses/CoursesPage';
import CourseDetailPage       from './pages/courses/CourseDetailPage';
import CourseCreatePage       from './pages/courses/CourseCreatePage';
import CourseUsersPage        from './pages/courses/CourseUsersPage';
import LessonCreatePage       from './pages/lessons/LessonCreatePage';
import LessonListPage         from './pages/lessons/LessonListPage';
import LessonDetailPage       from './pages/lessons/LessonDetailPage';
import GradesPage             from './pages/grades/GradesPage';
import GradeReportPage        from './pages/grades/GradeReportPage';
import StatisticsPage         from './pages/grades/StatisticsPage';
import AttendancePage         from './pages/attendance/AttendancePage';
import AttendanceLessonPage   from './pages/attendance/AttendanceLessonPage';
import AttendanceRequestsPage from './pages/attendance/AttendanceRequestsPage';
import GroupsPage             from './pages/groups/GroupsPage';
import GroupDetailPage        from './pages/groups/GroupDetailPage';
import UsersPage              from './pages/users/UsersPage';
import UserCreatePage         from './pages/users/UserCreatePage';
import SchoolsPage            from './pages/admin/SchoolsPage';
import SchoolCreatePage       from './pages/admin/SchoolCreatePage';
import SchoolDetailPage       from './pages/admin/SchoolDetailPage';
import CategoriesPage         from './pages/admin/CategoriesPage';
import AdminReportPage        from './pages/admin/AdminReportPage';
import StudentSchoolPage      from './pages/schools/StudentSchoolPage';
import ProfilePage            from './pages/profile/ProfilePage';
import SettingsPage           from './pages/profile/SettingsPage';
import NotificationsPage      from './pages/profile/NotificationsPage';
import SubmissionsPage        from './pages/submissions/SubmissionsPage';
import LessonSubmissionsPage  from './pages/submissions/LessonSubmissionsPage';
import SubmissionCreatePage   from './pages/submissions/SubmissionCreatePage';
import SubmissionViewPage     from './pages/submissions/SubmissionViewPage';
import SubmissionEditPage     from './pages/submissions/SubmissionEditPage';
import SubmissionGradePage    from './pages/submissions/SubmissionGradePage';
import CreditPricesPage       from './pages/payments/CreditPricesPage';
import PaymentsPage           from './pages/payments/PaymentsPage';
import UserPaymentsPage       from './pages/payments/UserPaymentsPage';
import PaymentDebtReportPage  from './pages/payments/PaymentDebtReportPage';
import PaymentPolicyPage      from './pages/payments/PaymentPolicyPage';
import ExamListPage           from './pages/exams/ExamListPage';
import ExamCreatePage         from './pages/exams/ExamCreatePage';
import ExamDetailPage         from './pages/exams/ExamDetailPage';
import ExamTakePage           from './pages/exams/ExamTakePage';
import ExamResultPage         from './pages/exams/ExamResultPage';
import ExamReportPage         from './pages/exams/ExamReportPage';
import ExamVariantListPage    from './pages/exams/ExamVariantListPage';
import ExamVariantFormPage    from './pages/exams/ExamVariantFormPage';
import ExamVariantDetailPage  from './pages/exams/ExamVariantDetailPage';

export default function Team2() {
  const staffOnly = (element, title, summary) => (
    <RequireAccess
      allow={canGrade}
      title={title}
      summary={summary || 'Энэ хэсэгт багш, сургуулийн админ, системийн админ хэрэглэгчид хандана.'}
    >
      {element}
    </RequireAccess>
  );

  const adminOnly = (element, title, summary) => (
    <RequireAccess
      allow={canManageUsers}
      title={title}
      summary={summary || 'Энэ хэсэгт зөвхөн сургуулийн админ болон системийн админ хэрэглэгчид хандана.'}
    >
      {element}
    </RequireAccess>
  );

  const courseManagerOnly = (element, title, summary) => (
    <RequireAccess
      allow={canManageCourseUsers}
      title={title}
      summary={summary || 'Энэ хэсэгт багш, сургуулийн админ, системийн админ хэрэглэгчид хандана.'}
    >
      {element}
    </RequireAccess>
  );

  const studentOnly = (element, title, summary) => (
    <RequireAccess
      allow={canSubmit}
      title={title}
      summary={summary || 'Энэ хэсэгт зөвхөн оюутан хэрэглэгч хандана.'}
    >
      {element}
    </RequireAccess>
  );

  return (
    <Routes>
      <Route path="/*" element={<Layout />}>
        <Route index element={<DashboardPage />} />

        <Route path="courses"                    element={<CoursesPage />} />
        <Route path="courses/create"             element={adminOnly(<CourseCreatePage />, 'Хичээл үүсгэх эрхгүй')} />
        <Route path="courses/:course_id"         element={<CourseDetailPage />} />
        <Route path="courses/:course_id/edit"    element={adminOnly(<CourseCreatePage />, 'Хичээл засах эрхгүй')} />
        <Route
          path="courses/:course_id/report"
          element={staffOnly(
            <RouteStubPage
              title="Хичээлийн тайлан"
              summary="Даалгаврын зураг дээрх course report route-ийг бэлдлээ. Энд course-level статистик, тайлангийн widget-үүдийг дараагийн алхмаар холбож болно."
            />
          , 'Хичээлийн тайлан харах эрхгүй')}
        />

        <Route path="lessons"                    element={<LessonListPage />} />
        <Route path="courses/:course_id/lessons" element={<LessonListPage />} />
        <Route
          path="courses/:course_id/lessons/create"
          element={staffOnly(<LessonCreatePage />, 'Сэдэв нэмэх эрхгүй')}
        />
        <Route path="lessons/:lesson_id"         element={<LessonDetailPage />} />
        <Route path="courses/:course_id/lessons/:lesson_id" element={<LessonDetailPage />} />
        <Route
          path="courses/:course_id/lessons/:lesson_id/edit"
          element={staffOnly(<LessonCreatePage />, 'Сэдэв засах эрхгүй')}
        />

        <Route path="grades"                     element={<GradesPage />} />
        <Route path="grade"                      element={<GradesPage />} />
        <Route path="grade-report"               element={staffOnly(<GradeReportPage />, 'Дүнгийн тайлан харах эрхгүй')} />
        <Route path="courses/:course_id/grade"   element={staffOnly(<GradeReportPage />, 'Хичээлийн журнал харах эрхгүй')} />
        <Route path="statistics"                 element={<StatisticsPage />} />

        <Route path="attendance"                 element={<AttendancePage />} />
        <Route path="course/:course_id/attendances" element={<AttendancePage />} />
        <Route path="courses/:course_id/attendances" element={<AttendancePage />} />
        <Route
          path="course/:course_id/attendances/:lesson_id"
          element={staffOnly(<AttendanceLessonPage />, 'Сэдвийн ирц удирдах эрхгүй')}
        />
        <Route
          path="course/:course_id/attendances/:lesson_id/requests"
          element={staffOnly(<AttendanceRequestsPage />, 'Чөлөөний хүсэлтүүд удирдах эрхгүй')}
        />
        <Route
          path="course/:course_id/attendances/requests"
          element={staffOnly(<AttendanceRequestsPage />, 'Ирцийн хүсэлтүүд удирдах эрхгүй')}
        />

        <Route path="groups"                     element={<GroupsPage />} />
        <Route path="courses/:course_id/groups"  element={<GroupsPage />} />
        <Route path="groups/:group_id"           element={<GroupDetailPage />} />
        <Route path="courses/:course_id/groups/:group_id/users" element={<GroupDetailPage />} />

        <Route path="users"                      element={adminOnly(<UsersPage />, 'Хэрэглэгчдийн жагсаалт харах эрхгүй')} />
        <Route path="users/create"               element={adminOnly(<UserCreatePage />, 'Хэрэглэгч нэмэх эрхгүй')} />
        <Route
          path="users/:user_id"
          element={adminOnly(
            <RouteStubPage
              title="Хэрэглэгчийн мэдээлэл"
              summary="User detail page route-ийг assignment-ийн бүтцэд орууллаа. Энд profile/detail card болон role/history мэдээлэл нэмэхэд бэлэн."
            />
          , 'Хэрэглэгчийн мэдээлэл харах эрхгүй')}
        />
        <Route path="users/:user_id/edit"        element={adminOnly(<UserCreatePage />, 'Хэрэглэгч засах эрхгүй')} />
        <Route
          path="courses/:course_id/users"
          element={courseManagerOnly(<CourseUsersPage />, 'Хичээлийн хэрэглэгчид удирдах эрхгүй')}
        />
        <Route
          path="courses/:course_id/users/edit"
          element={courseManagerOnly(
            <RouteStubPage
              title="Хичээлийн хэрэглэгч удирдах"
              summary="Course user edit route scaffold. Одоогийн global user form-оос тусад нь course enrollment management хийхэд зориулсан зам."
            />
          , 'Хичээлийн хэрэглэгч засах эрхгүй')}
        />

        <Route path="profile"                    element={<ProfilePage />} />
        <Route path="profile/change-password"    element={<ProfilePage />} />
        <Route path="settings"                   element={<SettingsPage />} />
        <Route path="notifications"              element={<NotificationsPage />} />

        <Route path="submissions"                               element={<SubmissionsPage />} />
        <Route path="submissions/create"                        element={studentOnly(<SubmissionCreatePage />, 'Илгээлт үүсгэх эрхгүй')} />
        <Route path="submissions/:submission_id"                element={<SubmissionViewPage />} />
        <Route path="submissions/:submission_id/edit"           element={studentOnly(<SubmissionEditPage />, 'Илгээлт засах эрхгүй')} />
        <Route path="submissions/:submission_id/grade"          element={staffOnly(<SubmissionGradePage />, 'Оноо өгөх эрхгүй')} />

        <Route path="courses/:course_id/submissions"            element={<SubmissionsPage />} />
        <Route path="courses/:course_id/lessons/:lesson_id/submissions"
          element={<LessonSubmissionsPage />} />
        <Route path="courses/:course_id/lessons/:lesson_id/submissions/create"
          element={studentOnly(<SubmissionCreatePage />, 'Илгээлт үүсгэх эрхгүй')} />
        <Route path="courses/:course_id/lessons/:lesson_id/submissions/:submission_id/edit"
          element={studentOnly(<SubmissionEditPage />, 'Илгээлт засах эрхгүй')} />

        <Route path="schools/current" element={<StudentSchoolPage />} />
        <Route path="schools/my" element={<StudentSchoolPage />} />
        <Route path="course-market" element={<StudentSchoolPage />} />
        <Route
          path="roles"
          element={adminOnly(
            <RouteStubPage
              title="Эрхийн удирдлага"
              summary="Admin role management route-ийг зурагт заасан бүтцээр нь бэлдлээ."
            />
          , 'Эрхийн удирдлага руу хандах эрхгүй')}
        />
        <Route
          path="schools"
          element={adminOnly(<SchoolsPage />, 'Сургуулийн хуудсууд руу хандах эрхгүй')}
        />
        <Route path="schools/create" element={adminOnly(<SchoolCreatePage />, 'Сургууль бүртгэх эрхгүй')} />
        <Route path="schools/:school_id" element={adminOnly(<SchoolDetailPage />, 'Сургуулийн мэдээлэл харах эрхгүй')} />
        <Route path="schools/:school_id/edit" element={adminOnly(<SchoolCreatePage />, 'Сургуулийн мэдээлэл засах эрхгүй')} />
        <Route path="report" element={adminOnly(<AdminReportPage />, 'Сургуулийн тайлан харах эрхгүй')} />
        <Route path="categories" element={adminOnly(<CategoriesPage />, 'Ангилал удирдах эрхгүй')} />

        <Route path="question-types" element={adminOnly(<RouteStubPage title="Асуултын төрөл" summary="Question type management route scaffold." />, 'Асуултын төрөл удирдах эрхгүй')} />
        <Route path="question-levels" element={adminOnly(<RouteStubPage title="Асуултын түвшин" summary="Question level management route scaffold." />, 'Асуултын түвшин удирдах эрхгүй')} />
        <Route path="courses/:course_id/question-points" element={staffOnly(<RouteStubPage title="Асуултын оноо" summary="Question point management route scaffold." />, 'Асуултын оноо удирдах эрхгүй')} />
        <Route path="courses/:course_id/questions" element={staffOnly(<RouteStubPage title="Асуултын сан" summary="Question bank list route scaffold." />, 'Асуултын сан руу хандах эрхгүй')} />
        <Route path="courses/:course_id/questions/create" element={staffOnly(<RouteStubPage title="Асуулт нэмэх" summary="Question create route scaffold." />, 'Асуулт нэмэх эрхгүй')} />
        <Route path="courses/:course_id/questions/:question_id" element={staffOnly(<RouteStubPage title="Асуулт харах" summary="Question detail route scaffold." />, 'Асуулт харах эрхгүй')} />
        <Route path="courses/:course_id/questions/:question_id/edit" element={staffOnly(<RouteStubPage title="Асуулт засах" summary="Question edit route scaffold." />, 'Асуулт засах эрхгүй')} />
        <Route path="courses/:course_id/questions/report" element={staffOnly(<RouteStubPage title="Асуултын тайлан" summary="Question report/statistics route scaffold." />, 'Асуултын тайлан харах эрхгүй')} />

        <Route path="courses/:course_id/exams" element={<ExamListPage />} />
        <Route path="courses/:course_id/exams/create" element={staffOnly(<ExamCreatePage />, 'Шалгалт үүсгэх эрхгүй')} />
        <Route path="exams" element={staffOnly(<ExamListPage />, 'Шалгалтын жагсаалт руу хандах эрхгүй')} />
        <Route path="exams/:exam_id" element={staffOnly(<ExamDetailPage />, 'Шалгалтын мэдээлэл харах эрхгүй')} />
        <Route path="exams/:exam_id/edit" element={staffOnly(<ExamCreatePage />, 'Шалгалт засах эрхгүй')} />
        <Route path="exams/:exam_id/report" element={staffOnly(<ExamReportPage />, 'Шалгалтын тайлан харах эрхгүй')} />
        <Route path="exams/:exam_id/variants" element={staffOnly(<ExamVariantListPage />, 'Шалгалтын вариант харах эрхгүй')} />
        <Route path="exams/:exam_id/variants/create" element={staffOnly(<ExamVariantFormPage />, 'Вариант нэмэх эрхгүй')} />
        <Route path="exams/:exam_id/variants/:id" element={staffOnly(<ExamVariantDetailPage />, 'Вариант харах эрхгүй')} />
        <Route path="exams/:exam_id/variants/:id/edit" element={staffOnly(<ExamVariantFormPage />, 'Вариант засах эрхгүй')} />
        <Route path="exams/:exam_id/students/:student_id" element={<ExamTakePage />} />
        <Route path="exams/:exam_id/students/:student_id/edit" element={<ExamTakePage />} />
        <Route path="exams/:exam_id/students/:student_id/check" element={<ExamResultPage />} />
        <Route path="exams/:exam_id/students/:student_id/result" element={<ExamResultPage />} />

        {/* Payments */}
        <Route path="payments"                element={<PaymentsPage />} />
        <Route path="payments/users/:user_id" element={<RequireAccess allow={canManagePayments} title="Оюутны төлбөр харах эрхгүй">{<UserPaymentsPage />}</RequireAccess>} />
        <Route path="credit-prices"           element={<RequireAccess allow={canManagePayments} title="Кредит үнэлгээ харах эрхгүй">{<CreditPricesPage />}</RequireAccess>} />
        <Route path="payment-debt-report"     element={<RequireAccess allow={canManagePayments} title="Өр тайлан харах эрхгүй">{<PaymentDebtReportPage />}</RequireAccess>} />
        <Route path="payment-policy"          element={<PaymentPolicyPage />} />

        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}
