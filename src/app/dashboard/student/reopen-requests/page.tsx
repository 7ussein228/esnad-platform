import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reopenRequests, courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

const statusLabel: Record<string, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "تمت الموافقة",
  REJECTED: "مرفوض",
};

export default async function StudentReopenPage() {
  const user = await requireRole("STUDENT");
  const unread = await getUnreadNotificationCount(user.id);

  const rows = await db
    .select({ req: reopenRequests, courseTitle: courses.title })
    .from(reopenRequests)
    .innerJoin(courses, eq(reopenRequests.courseId, courses.id))
    .where(eq(reopenRequests.studentId, user.id))
    .orderBy(desc(reopenRequests.createdAt));

  return (
    <DashboardShell user={user} navItems={navForRole("STUDENT")} unreadCount={unread}>
      <h1 className="font-display text-2xl font-bold text-ink-900">طلبات إعادة الفتح</h1>
      <p className="mt-1 text-ink-500">تابع حالة طلباتك للمستر.</p>

      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <Card key={r.req.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <div>
              <p className="font-bold text-ink-800">{r.courseTitle}</p>
              <p className="text-xs text-ink-500">{r.req.reason} · {formatDateTime(r.req.createdAt)}</p>
            </div>
            <Badge tone={statusTone[r.req.status]}>{statusLabel[r.req.status]}</Badge>
          </Card>
        ))}
        {rows.length === 0 && (
          <EmptyState
            title="لا توجد طلبات"
            description="لو درس مقفول عليك، افتحه ودوس طلب إعادة الفتح."
            action={<Button href="/dashboard/student/courses">كورساتي</Button>}
          />
        )}
      </div>
    </DashboardShell>
  );
}
