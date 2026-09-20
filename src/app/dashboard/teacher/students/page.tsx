import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  enrollments,
  users,
  assessments,
  assessmentAttempts,
  assignments,
  assignmentSubmissions,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { courseProgressPercentage } from "@/lib/access";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { GradeForm } from "./grade-form";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;
  const user = await requireRole("TEACHER", "ADMIN");
  const unread = await getUnreadNotificationCount(user.id);

  const myCourses = await db
    .select({ id: courses.id, title: courses.title, teacherId: courses.teacherId })
    .from(courses)
    .orderBy(desc(courses.createdAt));
  const visibleCourses = user.role === "ADMIN" ? myCourses : myCourses.filter((c) => c.teacherId === user.id);
  const activeCourseId = visibleCourses.some((c) => c.id === courseId) ? courseId! : visibleCourses[0]?.id;

  let enrolled: { studentId: string; name: string; email: string }[] = [];
  let progressByStudent = new Map<string, number>();
  let attempts: { id: string; title: string; studentName: string; percentage: number; passed: boolean; submittedAt: Date | null }[] = [];
  let submissions: {
    id: string; assignmentTitle: string; studentName: string; text: string | null;
    fileUrl: string | null; grade: number | null; feedback: string | null; status: string;
    maxScore: number; submittedAt: Date;
  }[] = [];

  if (activeCourseId) {
    const rows = await db
      .select({ studentId: enrollments.studentId, name: users.name, email: users.email })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(and(eq(enrollments.courseId, activeCourseId), eq(enrollments.status, "ACTIVE")))
      .orderBy(desc(enrollments.enrolledAt));
    enrolled = rows;
    progressByStudent = new Map(
      await Promise.all(rows.map(async (r) => [r.studentId, await courseProgressPercentage(r.studentId, activeCourseId)] as const))
    );

    const attRows = await db
      .select({
        id: assessmentAttempts.id,
        title: assessments.title,
        studentName: users.name,
        percentage: assessmentAttempts.percentage,
        passed: assessmentAttempts.passed,
        submittedAt: assessmentAttempts.submittedAt,
      })
      .from(assessmentAttempts)
      .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
      .innerJoin(users, eq(assessmentAttempts.studentId, users.id))
      .where(eq(assessments.courseId, activeCourseId))
      .orderBy(desc(assessmentAttempts.startedAt))
      .limit(50);
    attempts = attRows;

    const subRows = await db
      .select({
        id: assignmentSubmissions.id,
        assignmentTitle: assignments.title,
        studentName: users.name,
        text: assignmentSubmissions.textSubmission,
        fileUrl: assignmentSubmissions.fileUrl,
        grade: assignmentSubmissions.grade,
        feedback: assignmentSubmissions.feedback,
        status: assignmentSubmissions.status,
        maxScore: assignments.maxScore,
        submittedAt: assignmentSubmissions.submittedAt,
      })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
      .innerJoin(users, eq(assignmentSubmissions.studentId, users.id))
      .where(eq(assignments.courseId, activeCourseId))
      .orderBy(desc(assignmentSubmissions.submittedAt))
      .limit(50);
    submissions = subRows;
  }

  return (
    <DashboardShell user={user} navItems={navForRole("TEACHER")} unreadCount={unread}>
      <h1 className="font-display text-2xl font-bold text-ink-900">الطلاب والتقدم — دفتر الدرجات</h1>
      <p className="mt-1 text-ink-500">تابع تقدم كل طالب وصحح الواجبات المُرسلة.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {visibleCourses.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/teacher/students?courseId=${c.id}`}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${c.id === activeCourseId ? "bg-primary-600 text-white" : "border border-ink-200 text-ink-600 hover:border-primary-400"}`}
          >
            {c.title}
          </Link>
        ))}
      </div>

      {!activeCourseId && <EmptyState title="لا توجد كورسات" description="أنشئ كورسًا أولًا من صفحة الكورسات." />}

      {activeCourseId && (
        <>
          <h2 className="mt-8 font-bold text-ink-800">الطلاب المشتركون ({enrolled.length})</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enrolled.map((s) => (
              <Card key={s.studentId} className="p-4">
                <p className="font-bold text-ink-800">{s.name}</p>
                <p className="text-xs text-ink-400" dir="ltr">{s.email}</p>
                <p className="mt-2 text-sm">التقدم: <b className="text-primary-700">{progressByStudent.get(s.studentId) ?? 0}%</b></p>
              </Card>
            ))}
            {enrolled.length === 0 && <p className="text-sm text-ink-400">لا يوجد مشتركون بعد.</p>}
          </div>

          <h2 className="mt-8 font-bold text-ink-800">آخر محاولات الاختبارات</h2>
          <Card className="mt-3 divide-y divide-ink-100">
            {attempts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span className="text-ink-700">{a.studentName} — {a.title}</span>
                {a.submittedAt ? (
                  <Badge tone={a.passed ? "success" : "error"}>{a.percentage}%</Badge>
                ) : (
                  <Badge tone="warning">جارية</Badge>
                )}
              </div>
            ))}
            {attempts.length === 0 && <p className="p-4 text-sm text-ink-400">لا توجد محاولات بعد.</p>}
          </Card>

          <h2 className="mt-8 font-bold text-ink-800">الواجبات المُرسلة (تحتاج تصحيح)</h2>
          <div className="mt-3 space-y-4">
            {submissions.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-ink-800">{s.studentName} — {s.assignmentTitle}</p>
                  <Badge tone={s.status === "SUBMITTED" ? "warning" : s.status === "PASSED" ? "success" : "error"}>
                    {s.status === "SUBMITTED" ? "بانتظار التصحيح" : `${s.grade ?? 0}/${s.maxScore}`}
                  </Badge>
                </div>
                {s.text && <p className="mt-2 rounded-xl bg-papyrus-100 p-3 text-sm text-ink-700">{s.text}</p>}
                {s.fileUrl && (
                  <a href={s.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-bold text-primary-700 hover:underline">
                    فتح الملف المرفق
                  </a>
                )}
                {s.feedback && <p className="mt-2 text-xs text-ink-500">ملاحظاتك: {s.feedback}</p>}
                <p className="mt-1 text-[11px] text-ink-400">{formatDateTime(s.submittedAt)}</p>
                <GradeForm submissionId={s.id} currentGrade={s.grade} maxScore={s.maxScore} />
              </Card>
            ))}
            {submissions.length === 0 && <p className="text-sm text-ink-400">لا توجد واجبات مُرسلة بعد.</p>}
          </div>
        </>
      )}
    </DashboardShell>
  );
}
