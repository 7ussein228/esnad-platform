import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, courseModules, lessons, videoAssets, lessonFiles, grades, subjects } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button, Input, Label, Select } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/client-widgets";
import { ActionForm } from "@/components/action-form";
import { CourseCover } from "@/components/course-cover";
import { GenericUrlUploader } from "@/components/uploaders";
import { VideoUploader, FileUploader } from "@/components/uploaders";
import {
  createModuleAction,
  deleteModuleAction,
  createLessonAction,
  setLessonStatusAction,
  deleteLessonAction,
  setCourseStatusAction,
  deleteCourseAction,
  updateCourseThumbnailAction,
} from "@/server/actions/courses";

export const dynamic = "force-dynamic";

const lessonStatusTone: Record<string, "success" | "warning" | "neutral"> = {
  PUBLISHED: "success",
  DRAFT: "warning",
  ARCHIVED: "neutral",
};

export default async function TeacherCourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await requireRole("TEACHER", "ADMIN");

  const rows = await db
    .select({ course: courses, gradeName: grades.name, subjectName: subjects.name })
    .from(courses)
    .innerJoin(grades, eq(courses.gradeId, grades.id))
    .innerJoin(subjects, eq(courses.subjectId, subjects.id))
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!rows.length) notFound();
  const { course, gradeName, subjectName } = rows[0];
  if (user.role !== "ADMIN" && course.teacherId !== user.id) notFound();

  const unread = await getUnreadNotificationCount(user.id);

  const modules = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId))
    .orderBy(asc(courseModules.order));

  const moduleIds = modules.map((m) => m.id);
  const lessonsByModule = new Map<string, (typeof lessons.$inferSelect)[]>();
  const videosByLesson = new Map<string, (typeof videoAssets.$inferSelect)[]>();
  const filesByLesson = new Map<string, (typeof lessonFiles.$inferSelect)[]>();
  if (moduleIds.length) {
    const [allLessons, allVideos, allFiles] = await Promise.all([
      db.select().from(lessons).orderBy(asc(lessons.order)),
      db.select().from(videoAssets),
      db.select().from(lessonFiles),
    ]);
    for (const l of allLessons) {
      if (!moduleIds.includes(l.moduleId)) continue;
      if (!lessonsByModule.has(l.moduleId)) lessonsByModule.set(l.moduleId, []);
      lessonsByModule.get(l.moduleId)!.push(l);
      videosByLesson.set(l.id, allVideos.filter((v) => v.lessonId === l.id));
      filesByLesson.set(l.id, allFiles.filter((f) => f.lessonId === l.id));
    }
  }

  return (
    <DashboardShell user={user} navItems={navForRole("TEACHER")} unreadCount={unread}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex gap-2">
            <Badge tone="primary">{subjectName}</Badge>
            <Badge tone="neutral">{gradeName}</Badge>
            <Badge tone={course.status === "PUBLISHED" ? "success" : "warning"}>{course.status}</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900">{course.title}</h1>
        </div>
        <div className="flex gap-2">
          {course.status !== "PUBLISHED" ? (
            <form action={setCourseStatusAction.bind(null, course.id, "PUBLISHED")}>
              <Button type="submit" size="sm">نشر الكورس</Button>
            </form>
          ) : (
            <form action={setCourseStatusAction.bind(null, course.id, "DRAFT")}>
              <Button type="submit" size="sm" variant="outline">إخفاء (مسودة)</Button>
            </form>
          )}
          <ConfirmSubmitButton
            action={deleteCourseAction.bind(null, course.id)}
            confirmMessage="حذف الكورس نهائيًا بكل محتواه؟"
            className="rounded-xl px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            حذف
          </ConfirmSubmitButton>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CourseCover thumbnailUrl={course.thumbnailUrl} title={course.title} className="h-44" />
        <div className="p-6">
          <p className="font-bold text-ink-800">صورة غلاف الكورس</p>
          <p className="mt-1 text-xs text-ink-500">ارفع صورة من جهازك (يفضل 1280×720) — هتظهر في كل كروت الموقع.</p>
          <ActionForm action={updateCourseThumbnailAction.bind(null, course.id)} className="mt-3 flex flex-wrap items-center gap-3">
            <GenericUrlUploader hiddenInputName="thumbnailUrl" folder="thumbnails" accept="image/*" label="اختيار صورة الغلاف" />
            <Button type="submit" size="sm">حفظ الصورة</Button>
          </ActionForm>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <p className="font-bold text-ink-800">وحدة جديدة</p>
        <ActionForm action={createModuleAction.bind(null, course.id)} className="mt-3 flex gap-2">
          <Input name="title" required placeholder="عنوان الوحدة" className="flex-1" />
          <Button type="submit" size="sm">إضافة</Button>
        </ActionForm>
      </Card>

      <div className="mt-6 space-y-6">
        {modules.map((m, mi) => (
          <Card key={m.id} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 bg-papyrus-100/60 px-5 py-3">
              <p className="font-bold text-ink-800">الوحدة {mi + 1}: {m.title}</p>
              <ConfirmSubmitButton
                action={deleteModuleAction.bind(null, m.id)}
                confirmMessage="حذف الوحدة بكل دروسها؟"
                className="text-xs font-bold text-red-600 hover:underline"
              >
                حذف الوحدة
              </ConfirmSubmitButton>
            </div>

            <div className="space-y-5 p-5">
              {(lessonsByModule.get(m.id) || []).map((l) => (
                <div key={l.id} className="rounded-xl border border-ink-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-ink-800">{l.title}</p>
                      <Badge tone={lessonStatusTone[l.status]}>{l.status}</Badge>
                      {l.isFreePreview && <Badge tone="gold">معاينة مجانية</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      {l.status !== "PUBLISHED" ? (
                        <form action={setLessonStatusAction.bind(null, l.id, "PUBLISHED")}>
                          <Button type="submit" size="sm" variant="outline">نشر</Button>
                        </form>
                      ) : (
                        <form action={setLessonStatusAction.bind(null, l.id, "DRAFT")}>
                          <Button type="submit" size="sm" variant="ghost">مسودة</Button>
                        </form>
                      )}
                      <ConfirmSubmitButton
                        action={deleteLessonAction.bind(null, l.id)}
                        confirmMessage="حذف الدرس؟"
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        حذف
                      </ConfirmSubmitButton>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-bold text-ink-500">فيديو الشرح</p>
                      {(videosByLesson.get(l.id) || []).length > 0 ? (
                        (videosByLesson.get(l.id) || []).map((v) => (
                          <p key={v.id} className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
                            ✔ {v.originalFileName || "فيديو مرفوع"} ({Math.round(Number(v.sizeBytes || 0) / 1048576)}MB)
                          </p>
                        ))
                      ) : (
                        <VideoUploader lessonId={l.id} />
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-bold text-ink-500">ملفات الدرس (PDF)</p>
                      <div className="mb-2 space-y-1">
                        {(filesByLesson.get(l.id) || []).map((f) => (
                          <p key={f.id} className="rounded-lg bg-papyrus-100 px-3 py-2 text-xs text-ink-600">
                            {f.title}
                          </p>
                        ))}
                      </div>
                      <FileUploader lessonId={l.id} />
                    </div>
                  </div>
                </div>
              ))}

              <details className="rounded-xl bg-papyrus-100/60 p-4">
                <summary className="cursor-pointer text-sm font-bold text-primary-700">+ درس جديد في هذه الوحدة</summary>
                <ActionForm action={createLessonAction.bind(null, m.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>عنوان الدرس</Label>
                    <Input name="title" required minLength={2} />
                  </div>
                  <div>
                    <Label>النوع</Label>
                    <Select name="type" defaultValue="VIDEO">
                      <option value="VIDEO">فيديو</option>
                      <option value="TEXT">نص</option>
                      <option value="PDF">ملف PDF</option>
                      <option value="MIXED">متنوع</option>
                    </Select>
                  </div>
                  <div className="flex items-end gap-4 pb-2 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" name="isFreePreview" /> معاينة مجانية</label>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>المحتوى النصي (للدروس النصية)</Label>
                    <Input name="textContent" placeholder="اختياري" />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" size="sm">إضافة الدرس</Button>
                  </div>
                </ActionForm>
              </details>
            </div>
          </Card>
        ))}
        {modules.length === 0 && (
          <Card className="p-8 text-center text-sm text-ink-500">لا توجد وحدات بعد — أضف أول وحدة من الأعلى.</Card>
        )}
      </div>
    </DashboardShell>
  );
}
