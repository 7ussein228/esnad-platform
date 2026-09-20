import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, SectionHeading, Badge } from "@/components/ui";
import { ProfileInfoForm, ChangePasswordForm } from "./profile-forms";

export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = { STUDENT: "طالب", TEACHER: "مستر", ADMIN: "مدير المنصة" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [fullUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const unread = await getUnreadNotificationCount(user.id);

  return (
    <DashboardShell user={user} navItems={navForRole(user.role)} unreadCount={unread}>
      <SectionHeading eyebrow="حسابي" title="الملف الشخصي" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-100 font-display text-xl font-bold text-primary-700">
              {user.name.slice(0, 1)}
            </span>
            <div>
              <p className="font-bold text-ink-800">{user.name}</p>
              <p className="text-sm text-ink-500">{fullUser.email}</p>
              <Badge tone="gold" className="mt-1">{roleLabel[user.role]}</Badge>
            </div>
          </div>
          <ProfileInfoForm name={fullUser.name} phone={fullUser.phone} bio={fullUser.bio} />
        </Card>
        <Card className="p-6">
          <p className="mb-4 font-bold text-ink-800">تغيير كلمة المرور</p>
          <ChangePasswordForm />
        </Card>
      </div>
    </DashboardShell>
  );
}
