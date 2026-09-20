import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reopenRequests, users, courses, lessons } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { ActionButton } from "@/components/client-widgets";
import { reviewReopenRequestAction } from "@/server/actions/learning";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

export default async function TeacherReopenPage() {
  const user = await requireRole("TEACHER", "ADMIN");
  const unread = await getUnreadNotificationCount(user.id);

  // Teacher sees requests for own courses (admin sees all).
  const rows = await db
    .select({
      req: reopenRequests,
      studentName: users.name,
      courseTitle: courses.title,
      courseId: courses.id,
      courseTeacherId: courses.teacherId,
      lessonTitle: lessons.title,
    })
    .from(reopenRequests)
    .innerJoin(users, eq(reopenRequests.studentId, users.id))
    .innerJoin(courses, eq(reopenRequests.courseId, courses.id))
    .leftJoin(lessons, eq(reopenRequests.lessonId, lessons.id))
    .orderBy(desc(reopenRequests.createdAt));

  const visible = user.role === "ADMIN" ? rows : rows.filter((r) => r.courseTeacherId === user.id);
  const pending = visible.filter((r) => r.req.status === "PENDING");
  const history = visible.filter((r) => r.req.status !== "PENDING");

  return (
    <DashboardShell user={user} navItems={navForRole("TEACHER")} unreadCount={unread}>
      <h1 className="font-display text-2xl font-bold text-ink-900">طلبات إعادة الفتح</h1>
      <p className="mt-1 text-ink-500">راجع طلبات الطلاب لفتح دروس أو اختبارات مستنفدة ({pending.length} معلق).</p>

      <div className="mt-6 space-y-4">
        {pending.map((r) => (
          <Card key={r.req.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-ink-800">{r.studentName}</p>
                <p className="text-xs text-ink-500">
                  {r.courseTitle} {r.lessonTitle ? `— ${r.lessonTitle}` : ""} · {r.req.contentType}
                </p>
              </div>
              <Badge tone="warning">معلق</Badge>
            </div>
            <p className="mt-3 rounded-xl bg-papyrus-100 p-3 text-sm text-ink-700">سبب الطالب: {r.req.reason}</p>
            <p className="mt-2 text-[11px] text-ink-400">{formatDateTime(r.req.createdAt)}</p>
            <div className="mt-3 flex gap-2">
              <ActionButton
                action={reviewReopenRequestAction.bind(null, r.req.id, "APPROVED")}
                className="rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-700"
                pendingText="جارٍ..."
              >
                موافقة وفتح المحتوى
              </ActionButton>
              <ActionButton
                action={reviewReopenRequestAction.bind(null, r.req.id, "REJECTED")}
                className="rounded-xl border border-red-200 px-5 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                pendingText="جارٍ..."
              >
                رفض
              </ActionButton>
            </div>
          </Card>
        ))}
        {pending.length === 0 && (
          <EmptyState title="لا توجد طلبات معلقة" description="كل الطلبات تمت مراجعتها." />
        )}
      </div>

      {history.length > 0 && (
        <>
          <h2 className="mt-10 font-bold text-ink-800">سجل المراجعات</h2>
          <div className="mt-3 space-y-2">
            {history.slice(0, 20).map((r) => (
              <Card key={r.req.id} className="flex items-center justify-between p-4 text-sm">
                <span className="text-ink-700">{r.studentName} — {r.courseTitle}</span>
                <Badge tone={statusTone[r.req.status]}>{r.req.status}</Badge>
              </Card>
            ))}
          </div>
          <div className="mt-4">
            <Button href="/dashboard/teacher" variant="ghost" size="sm">رجوع للوحة المستر</Button>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
