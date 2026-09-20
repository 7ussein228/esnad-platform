import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { BookOpen, FileCheck2, ClipboardList, Trophy } from "lucide-react";
import { db } from "@/db";
import { enrollments, courses, grades, subjects, assessmentAttempts, assessments, assignmentSubmissions, assignments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { courseProgressPercentage } from "@/lib/access";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, ProgressBar, Button, EmptyState, StatCard, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StudentOverviewPage() {
  const user = await requireRole("STUDENT");
  const unread = await getUnreadNotificationCount(user.id);

  const myEnrollments = await db
    .select({ courseId: courses.id, title: courses.title, gradeName: grades.name, subjectName: subjects.name })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(grades, eq(courses.gradeId, grades.id))
    .innerJoin(subjects, eq(courses.subjectId, subjects.id))
    .where(and(eq(enrollments.studentId, user.id), eq(enrollments.status, "ACTIVE")))
    .orderBy(desc(enrollments.enrolledAt));

  const coursesWithProgress = await Promise.all(
    myEnrollments.map(async (c) => ({ ...c, progress: await courseProgressPercentage(user.id, c.courseId) }))
  );

  const recentAttempts = await db
    .select({ attempt: assessmentAttempts, title: assessments.title, kind: assessments.kind })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
    .where(eq(assessmentAttempts.studentId, user.id))
    .orderBy(desc(assessmentAttempts.startedAt))
    .limit(5);

  const mySubmissions = await db
    .select({ submission: assignmentSubmissions, title: assignments.title, maxScore: assignments.maxScore })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
    .where(eq(assignmentSubmissions.studentId, user.id))
    .orderBy(desc(assignmentSubmissions.submittedAt))
    .limit(5);

  const avgProgress = coursesWithProgress.length
    ? Math.round(coursesWithProgress.reduce((a, c) => a + c.progress, 0) / coursesWithProgress.length)
    : 0;

  return (
    <DashboardShell user={user} navItems={navForRole("STUDENT")} unreadCount={unread}>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">أهلًا بعودتك، {user.name} 👋</h1>
        <p className="mt-1 text-ink-500">تابع تقدمك في التعلم وواصل رحلتك نحو التفوق.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="الكورسات النشطة" value={coursesWithProgress.length} />
        <StatCard label="متوسط التقدم" value={`${avgProgress}%`} tone="gold" />
        <StatCard label="محاولات الاختبارات" value={recentAttempts.length} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-ink-800"><BookOpen className="h-5 w-5 text-primary-600" /> أكمل التعلم</h2>
            <Link href="/dashboard/student/courses" className="text-sm font-bold text-primary-700 hover:underline">كل الكورسات</Link>
          </div>
          <div className="space-y-4">
            {coursesWithProgress.map((c) => (
              <Card key={c.courseId} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="mb-1 flex gap-2">
                      <Badge tone="primary">{c.subjectName}</Badge>
                      <Badge tone="neutral">{c.gradeName}</Badge>
                    </div>
                    <p className="font-bold text-ink-800">{c.title}</p>
                  </div>
                  <Button href={`/dashboard/student/courses/${c.courseId}`} size="sm">متابعة</Button>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-ink-500">
                    <span>نسبة الإنجاز</span>
                    <span>{c.progress}%</span>
                  </div>
                  <ProgressBar value={c.progress} />
                </div>
              </Card>
            ))}
            {coursesWithProgress.length === 0 && (
              <EmptyState title="لم تشترك في أي كورس بعد" description="استكشف الكورسات المتاحة وابدأ رحلتك التعليمية." action={<Button href="/explore">استكشف الكورسات</Button>} />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-bold text-ink-800"><Trophy className="h-5 w-5 text-gold-600" /> آخر نتائج الاختبارات</h2>
            <Card className="divide-y divide-ink-100">
              {recentAttempts.map((a) => (
                <div key={a.attempt.id} className="flex items-center justify-between p-4 text-sm">
                  <span className="text-ink-700">{a.title}</span>
                  {a.attempt.submittedAt ? (
                    <Badge tone={a.attempt.passed ? "success" : "error"}>{a.attempt.percentage}%</Badge>
                  ) : (
                    <Badge tone="warning">جارية</Badge>
                  )}
                </div>
              ))}
              {recentAttempts.length === 0 && <p className="p-4 text-sm text-ink-400">لا توجد محاولات بعد</p>}
            </Card>
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 font-bold text-ink-800"><ClipboardList className="h-5 w-5 text-primary-600" /> آخر الواجبات</h2>
            <Card className="divide-y divide-ink-100">
              {mySubmissions.map((s) => (
                <div key={s.submission.id} className="flex items-center justify-between p-4 text-sm">
                  <span className="text-ink-700">{s.title}</span>
                  <Badge tone={s.submission.status === "PASSED" ? "success" : s.submission.status === "FAILED" ? "error" : "warning"}>
                    {s.submission.status === "SUBMITTED" ? "بانتظار التصحيح" : `${s.submission.grade ?? 0}/${s.maxScore}`}
                  </Badge>
                </div>
              ))}
              {mySubmissions.length === 0 && <p className="p-4 text-sm text-ink-400">لا توجد واجبات مُرسلة بعد</p>}
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
