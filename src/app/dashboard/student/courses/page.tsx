import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, courses, grades, subjects } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { courseProgressPercentage } from "@/lib/access";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button, EmptyState, ProgressBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage() {
  const user = await requireRole("STUDENT");
  const unread = await getUnreadNotificationCount(user.id);

  const rows = await db
    .select({
      courseId: courses.id,
      slug: courses.slug,
      title: courses.title,
      thumbnailUrl: courses.thumbnailUrl,
      gradeName: grades.name,
      subjectName: subjects.name,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(grades, eq(courses.gradeId, grades.id))
    .innerJoin(subjects, eq(courses.subjectId, subjects.id))
    .where(and(eq(enrollments.studentId, user.id), eq(enrollments.status, "ACTIVE")))
    .orderBy(desc(enrollments.enrolledAt));

  const withProgress = await Promise.all(
    rows.map(async (c) => ({ ...c, progress: await courseProgressPercentage(user.id, c.courseId) }))
  );

  return (
    <DashboardShell user={user} navItems={navForRole("STUDENT")} unreadCount={unread}>
      <h1 className="font-display text-2xl font-bold text-ink-900">كورساتي</h1>
      <p className="mt-1 text-ink-500">كل الكورسات المشترك فيها ونسبة إنجازك.</p>

      <div className="mt-6 space-y-4">
        {withProgress.map((c) => (
          <Card key={c.courseId} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {c.thumbnailUrl ? (
                  <img src={c.thumbnailUrl} alt={`غلاف ${c.title}`} loading="lazy" className="h-14 w-24 rounded-lg object-cover" />
                ) : null}
                <div>
                <div className="mb-1 flex gap-2">
                  <Badge tone="primary">{c.subjectName}</Badge>
                  <Badge tone="neutral">{c.gradeName}</Badge>
                </div>
                <p className="font-bold text-ink-800">{c.title}</p>
                </div>
              </div>
              <Button href={`/dashboard/student/courses/${c.courseId}`} size="sm">ادخل الكورس</Button>
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
        {withProgress.length === 0 && (
          <EmptyState
            title="لم تشترك في أي كورس بعد"
            description="استكشف الكورسات المتاحة وابدأ رحلتك التعليمية."
            action={<Button href="/explore">استكشف الكورسات</Button>}
          />
        )}
      </div>
    </DashboardShell>
  );
}
