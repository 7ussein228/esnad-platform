import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, courseModules, enrollments, grades, subjects, gradeSubjects } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button, Input, Label, Select, EmptyState } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { formatCurrency } from "@/lib/utils";
import { createCourseAction } from "@/server/actions/courses";

export const dynamic = "force-dynamic";

export default async function TeacherCoursesPage() {
  const user = await requireRole("TEACHER", "ADMIN");
  const unread = await getUnreadNotificationCount(user.id);

  const baseQuery = db
    .select({
      id: courses.id,
      title: courses.title,
      price: courses.price,
      currency: courses.currency,
      status: courses.status,
      thumbnailUrl: courses.thumbnailUrl,
      gradeName: grades.name,
      subjectName: subjects.name,
    })
    .from(courses)
    .innerJoin(grades, eq(courses.gradeId, grades.id))
    .innerJoin(subjects, eq(courses.subjectId, subjects.id))
    .orderBy(desc(courses.createdAt));

  // TEACHER sees own courses only; ADMIN sees everything (moderation).
  const listedCourses =
    user.role === "ADMIN" ? await baseQuery : await baseQuery.where(eq(courses.teacherId, user.id));

  const stats = await Promise.all(
    listedCourses.map(async (c) => {
      const [[mods], [enr]] = await Promise.all([
        db.select({ c: count() }).from(courseModules).where(eq(courseModules.courseId, c.id)),
        db.select({ c: count() }).from(enrollments).where(eq(enrollments.courseId, c.id)),
      ]);
      return { id: c.id, modules: mods.c, enrollments: enr.c };
    })
  );
  const statById = new Map(stats.map((s) => [s.id, s]));

  const links = await db
    .select({ id: gradeSubjects.id, gradeName: grades.name, subjectName: subjects.name })
    .from(gradeSubjects)
    .innerJoin(grades, eq(gradeSubjects.gradeId, grades.id))
    .innerJoin(subjects, eq(gradeSubjects.subjectId, subjects.id));

  return (
    <DashboardShell user={user} navItems={navForRole("TEACHER")} unreadCount={unread}>
      <h1 className="font-display text-2xl font-bold text-ink-900">كورساتي</h1>
      <p className="mt-1 text-ink-500">أنشئ كورس جديد وأدِر الوحدات والدروس والفيديوهات.</p>

      <Card className="mt-6 p-6">
        <p className="font-bold text-ink-800">كورس جديد</p>
        <ActionForm action={createCourseAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>عنوان الكورس</Label>
            <Input name="title" required minLength={3} placeholder="مثال: شرح منهج الدراسات — الصف الأول الإعدادي" />
          </div>
          <div className="sm:col-span-2">
            <Label>الوصف</Label>
            <Input name="description" placeholder="نبذة عن الكورس" />
          </div>
          <div>
            <Label>الصف والمادة</Label>
            <Select name="gradeSubjectId" required defaultValue="">
              <option value="" disabled>اختار الصف والمادة</option>
              {links.map((l) => (
                <option key={l.id} value={l.id}>{l.gradeName} — {l.subjectName}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>السعر (0 = مجاني)</Label>
              <Input name="price" type="number" min={0} defaultValue={0} dir="ltr" />
            </div>
            <div>
              <Label>العملة</Label>
              <Input name="currency" defaultValue="EGP" dir="ltr" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">إنشاء الكورس</Button>
          </div>
        </ActionForm>
      </Card>

      <div className="mt-6 grid gap-4">
        {listedCourses.map((c) => (
          <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              {c.thumbnailUrl ? (
                <img src={c.thumbnailUrl} alt={`غلاف ${c.title}`} loading="lazy" className="h-14 w-24 rounded-lg object-cover" />
              ) : (
                <span className="grid h-14 w-24 place-items-center rounded-lg bg-papyrus-100 text-[11px] font-bold text-ink-400">بدون صورة</span>
              )}
              <div>
              <div className="mb-1 flex gap-2">
                <Badge tone="primary">{c.subjectName}</Badge>
                <Badge tone="neutral">{c.gradeName}</Badge>
                <Badge tone={c.status === "PUBLISHED" ? "success" : "warning"}>{c.status}</Badge>
              </div>
              <p className="font-bold text-ink-800">{c.title}</p>
              <p className="mt-1 text-xs text-ink-500">
                {statById.get(c.id)?.modules ?? 0} وحدة · {statById.get(c.id)?.enrollments ?? 0} مشترك ·{" "}
                {Number(c.price) === 0 ? "مجانًا" : formatCurrency(c.price, c.currency)}
              </p>
              </div>
            </div>
            <Button href={`/dashboard/teacher/courses/${c.id}`} size="sm">إدارة المحتوى</Button>
          </Card>
        ))}
        {listedCourses.length === 0 && (
          <EmptyState title="لا توجد كورسات بعد" description="أنشئ أول كورس من النموذج أعلاه." />
        )}
      </div>
    </DashboardShell>
  );
}
