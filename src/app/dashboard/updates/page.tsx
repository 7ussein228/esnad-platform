import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { notifications, announcements, courses, enrollments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, SectionHeading, EmptyState } from "@/components/ui";
import { NotificationItem, AnnouncementCard, CreateAnnouncementForm, MarkAllReadButton } from "./updates-client";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const user = await requireUser();
  const unread = await getUnreadNotificationCount(user.id);

  const myNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  let relevantAnnouncements;
  if (user.role === "ADMIN") {
    relevantAnnouncements = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(20);
  } else if (user.role === "TEACHER") {
    relevantAnnouncements = await db
      .select()
      .from(announcements)
      .where(or(eq(announcements.authorId, user.id), eq(announcements.targetType, "ALL")))
      .orderBy(desc(announcements.createdAt))
      .limit(20);
  } else {
    const myCourses = await db.select({ courseId: enrollments.courseId }).from(enrollments).where(eq(enrollments.studentId, user.id));
    const courseIds = myCourses.map((c) => c.courseId);
    const all = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(50);
    relevantAnnouncements = all.filter((a) => a.targetType === "ALL" || (a.targetType === "COURSE" && courseIds.includes(a.targetCourseId || "")));
  }

  let myCoursesForForm: { id: string; title: string }[] = [];
  if (user.role === "TEACHER" || user.role === "ADMIN") {
    myCoursesForForm = await db
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(user.role === "ADMIN" ? undefined : eq(courses.teacherId, user.id));
  }

  return (
    <DashboardShell user={user} navItems={navForRole(user.role)} unreadCount={unread}>
      <SectionHeading eyebrow="التحديثات" title="الإشعارات والإعلانات" />

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-ink-800">الإشعارات ({unread} غير مقروءة)</h3>
            <MarkAllReadButton />
          </div>
          <div className="space-y-3">
            {myNotifications.map((n) => (
              <NotificationItem key={n.id} id={n.id} title={n.title} body={n.body} isRead={n.isRead} createdAt={n.createdAt} link={n.link} />
            ))}
            {myNotifications.length === 0 && <EmptyState title="لا توجد إشعارات حتى الآن" />}
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-bold text-ink-800">الإعلانات</h3>
          {(user.role === "TEACHER" || user.role === "ADMIN") && (
            <Card className="mb-4 p-5">
              <p className="mb-3 text-sm font-bold text-ink-700">نشر إعلان جديد</p>
              <CreateAnnouncementForm courses={myCoursesForForm} />
            </Card>
          )}
          <div className="space-y-3">
            {relevantAnnouncements.map((a) => (
              <AnnouncementCard key={a.id} id={a.id} title={a.title} body={a.body} createdAt={a.createdAt} canDelete={user.role === "ADMIN" || a.authorId === user.id} />
            ))}
            {relevantAnnouncements.length === 0 && <EmptyState title="لا توجد إعلانات حاليًا" />}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
