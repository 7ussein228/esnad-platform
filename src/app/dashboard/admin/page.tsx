import { count } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const user = await requireRole("ADMIN");
  const unread = await getUnreadNotificationCount(user.id);

  const [[studentsCount], [teachersCount], [coursesCount]] = await Promise.all([
    db.select({ c: count() }).from(users).where(eq(users.role, "STUDENT")),
    db.select({ c: count() }).from(users).where(eq(users.role, "TEACHER")),
    db.select({ c: count() }).from(courses),
  ]);

  return (
    <DashboardShell user={user} navItems={navForRole("ADMIN")} unreadCount={unread}>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">لوحة الإدارة</h1>
        <p className="mt-1 text-ink-500">المنصة شغالة بنظام المدرس الواحد — التسجيل العام للطلبة فقط.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="الطلاب" value={studentsCount.c} />
        <StatCard label="حسابات المدرسين" value={teachersCount.c} tone="gold" />
        <StatCard label="الكورسات" value={coursesCount.c} />
      </div>
    </DashboardShell>
  );
}
