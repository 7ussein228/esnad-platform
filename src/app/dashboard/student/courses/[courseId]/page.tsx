import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { PlayCircle, FileText, Lock, CheckCircle2, FileCheck2, ClipboardList } from "lucide-react";
import { db } from "@/db";
import {
  courses, courseModules, lessons, studentProgress, assessments, assessmentAttempts,
  assignments, assignmentSubmissions, grades, subjects,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { canAccessLesson, courseProgressPercentage, isEnrolled } from "@/lib/access";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button, ProgressBar } from "@/components/ui";
import { AssignmentSubmitForm } from "@/components/assignment-submit-form";

export const dynamic = "force-dynamic";

export default async function StudentCourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await requireRole("STUDENT");

  const courseRows = await db
    .select({ course: courses, gradeName: grades.name, subjectName: subjects.name })
    .from(courses)
    .innerJoin(grades, eq(courses.gradeId, grades.id))
    .innerJoin(subjects, eq(courses.subjectId, subjects.id))
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!courseRows.length) notFound();
  const { course, gradeName, subjectName } = courseRows[0];
  if (!(await isEnrolled(user.id, courseId))) {
    return (
      <DashboardShell user={user} navItems={navForRole("STUDENT")} unreadCount={0}>
        <Card className="p-8 text-center">
          <p className="font-bold text-ink-800">أنت غير مشترك في هذا الكورس</p>
          <Button href={`/courses/${course.slug}`} className="mt-4">صفحة الكورس والاشتراك</Button>
        </Card>
      </DashboardShell>
    );
  }

  const unread = await getUnreadNotificationCount(user.id);
  const progress = await courseProgressPercentage(user.id, courseId);

  const modules = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId))
    .orderBy(asc(courseModules.order));

  const completedRows = await db
    .select({ lessonId: studentProgress.lessonId })
    .from(studentProgress)
    .where(and(eq(studentProgress.studentId, user.id), eq(studentProgress.courseId, courseId), eq(studentProgress.completed, true)));
  const completedSet = new Set(completedRows.map((r) => r.lessonId));

  const lessonsWithAccess = await Promise.all(
    modules.map(async (m) => {
      const ls = await db.select().from(lessons).where(and(eq(lessons.moduleId, m.id), eq(lessons.status, "PUBLISHED"))).orderBy(asc(lessons.order));
      const withAccess = await Promise.all(
        ls.map(async (l) => ({ lesson: l, access: await canAccessLesson(user.id, l.id) }))
      );
      return { module: m, lessons: withAccess };
    })
  );

  const quizzes = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.courseId, courseId), eq(assessments.status, "PUBLISHED")))
    .orderBy(asc(assessments.order));

  const myAttempts = await db
    .select()
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.studentId, user.id))
    .orderBy(desc(assessmentAttempts.startedAt));

  const courseAssignments = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.courseId, courseId), eq(assignments.status, "PUBLISHED")))
    .orderBy(asc(assignments.order));

  const mySubmissions = await db
    .select()
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.studentId, user.id));
  const submissionByAssignment = new Map(mySubmissions.map((s) => [s.assignmentId, s]));

  return (
    <DashboardShell user={user} navItems={navForRole("STUDENT")} unreadCount={unread}>
      <div className="mb-1 flex gap-2">
        <Badge tone="primary">{subjectName}</Badge>
        <Badge tone="neutral">{gradeName}</Badge>
      </div>
      <h1 className="font-display text-2xl font-bold text-ink-900">{course.title}</h1>
      <div className="mt-3 max-w-md">
        <div className="mb-1 flex justify-between text-xs text-ink-500">
          <span>تقدمك في الكورس</span><span>{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      <h2 className="mt-8 font-bold text-ink-800">دروس الكورس</h2>
      <div className="mt-3 space-y-4">
        {lessonsWithAccess.map(({ module, lessons: ls }) => (
          <Card key={module.id} className="overflow-hidden">
            <div className="border-b border-ink-100 bg-papyrus-100/60 px-5 py-3">
              <p className="font-bold text-ink-800">{module.title}</p>
            </div>
            <ul className="divide-y divide-ink-100">
              {ls.map(({ lesson: l, access }) => (
                <li key={l.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="flex items-center gap-2 text-ink-700">
                    {completedSet.has(l.id) ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : l.type === "VIDEO" ? (
                      <PlayCircle className="h-4 w-4 text-primary-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary-500" />
                    )}
                    {l.title}
                    {l.isFreePreview && <Badge tone="gold">مجاني</Badge>}
                  </span>
                  {access.allowed ? (
                    <Link
                      href={`/dashboard/student/courses/${courseId}/lessons/${l.id}`}
                      className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-primary-700"
                    >
                      {completedSet.has(l.id) ? "مراجعة" : "ابدأ"}
                    </Link>
                  ) : (
                    <span title={access.reason} className="flex items-center gap-1 text-xs text-ink-400">
                      <Lock className="h-4 w-4" /> مقفل
                    </span>
                  )}
                </li>
              ))}
              {ls.length === 0 && <li className="px-5 py-3 text-sm text-ink-400">لا توجد دروس منشورة بعد.</li>}
            </ul>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 flex items-center gap-2 font-bold text-ink-800"><FileCheck2 className="h-5 w-5 text-primary-600" /> الاختبارات والامتحانات</h2>
      <div className="mt-3 grid gap-3">
        {quizzes.map((q) => {
          const last = myAttempts.find((a) => a.assessmentId === q.id);
          return (
            <Card key={q.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div>
                <p className="font-bold text-ink-800">{q.title}</p>
                <p className="text-xs text-ink-500">
                  {q.kind === "EXAM" ? "امتحان" : "اختبار"} · النجاح {q.passingPercentage}% · {q.maxAttempts} محاولات
                  {last?.submittedAt ? ` · آخر نتيجة ${last.percentage}%` : ""}
                </p>
              </div>
              <Button href={`/dashboard/student/assessments/${q.id}`} size="sm">ادخل</Button>
            </Card>
          );
        })}
        {quizzes.length === 0 && <p className="text-sm text-ink-400">لا توجد اختبارات منشورة بعد.</p>}
      </div>

      <h2 className="mt-8 flex items-center gap-2 font-bold text-ink-800"><ClipboardList className="h-5 w-5 text-primary-600" /> الواجبات</h2>
      <div className="mt-3 space-y-4">
        {courseAssignments.map((a) => {
          const sub = submissionByAssignment.get(a.id);
          return (
            <Card key={a.id} className="p-5">
              <p className="font-bold text-ink-800">{a.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">{a.instructions}</p>
              {sub ? (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Badge tone={sub.status === "SUBMITTED" ? "warning" : sub.status === "PASSED" ? "success" : "error"}>
                    {sub.status === "SUBMITTED" ? "تم التسليم — بانتظار التصحيح" : `الدرجة: ${sub.grade ?? 0}/${a.maxScore}`}
                  </Badge>
                  {sub.feedback && <span className="text-xs text-ink-500">ملاحظات المستر: {sub.feedback}</span>}
                </div>
              ) : (
                <AssignmentSubmitForm assignmentId={a.id} />
              )}
            </Card>
          );
        })}
        {courseAssignments.length === 0 && <p className="text-sm text-ink-400">لا توجد واجبات بعد.</p>}
      </div>
    </DashboardShell>
  );
}
