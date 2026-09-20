import { count } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, users, enrollments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, StatCard, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

// Single-teacher mode: fixed teacher account dashboard.
// No public teacher registration — this page is only reachable by the seeded TEACHER (or ADMIN).
export default async function TeacherOverviewPage() {
  const user = await requireRole("TEACHER", "ADMIN");
  const unread = await getUnreadNotificationCount(user.id);

  const [[studentsCount], [coursesCount], [enrollmentsCount]] = await Promise.all([
    db.select({ c: count() }).from(users).where(eq(users.role, "STUDENT")),
    db.select({ c: count() }).from(courses),
    db.select({ c: count() }).from(enrollments),
  ]);

  return (
    <DashboardShell user={user} navItems={navForRole("TEACHER")} unreadCount={unread}>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">أهلًا {user.name} (حساب المستر الثابت)</h1>
        <p className="mt-1 text-ink-500">دي لوحة المستر الوحيد للمنصة — كل الكورسات والطلاب تحت إشرافك.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي الطلاب" value={studentsCount.c} />
        <StatCard label="إجمالي الكورسات" value={coursesCount.c} tone="gold" />
        <StatCard label="إجمالي الاشتراكات" value={enrollmentsCount.c} />
      </div>

      <Card className="mt-8 p-6">
        <p className="font-bold text-ink-800">إدارة المحتوى</p>
        <p className="mt-2 text-sm text-ink-500">
          صفحات إدارة الكورسات/الطلاب التفصيلية لسه بتتبني. حاليًا تقدر تدير المحتوى من الـ seed والـ Server Actions
          في <code dir="ltr">src/server/actions/courses.ts</code>.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button href="/explore" variant="outline">معاينة الكورسات كطالب</Button>
          <Button href="/dashboard/updates">الإعلانات والإشعارات</Button>
        </div>
      </Card>
    </DashboardShell>
  );
}
