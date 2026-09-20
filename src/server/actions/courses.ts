"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  courseModules,
  lessons,
  videoAssets,
  lessonFiles,
  gradeSubjects,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { logAudit, notifyEnrolledStudents } from "@/lib/notifications";
import { deleteObject } from "@/lib/storage";

export type ActionState = { error?: string; success?: string } | null;

async function assertCourseOwnership(courseId: string, teacherId: string, role: string) {
  const rows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!rows.length) throw new Error("الكورس غير موجود");
  if (role !== "ADMIN" && rows[0].teacherId !== teacherId) {
    throw new Error("لا يمكنك تعديل كورس لا تملكه");
  }
  return rows[0];
}

const courseSchema = z.object({
  title: z.string().min(3, "عنوان الكورس مطلوب"),
  description: z.string().optional(),
  gradeSubjectId: z.string().uuid("اختر الصف والمادة"),
  price: z.coerce.number().min(0),
  currency: z.string().default("EGP"),
});

export async function createCourseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    gradeSubjectId: formData.get("gradeSubjectId"),
    price: formData.get("price") || 0,
    currency: formData.get("currency") || "EGP",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  const link = await db.select().from(gradeSubjects).where(eq(gradeSubjects.id, parsed.data.gradeSubjectId)).limit(1);
  if (!link.length) return { error: "الربط بين الصف والمادة غير موجود" };

  const [created] = await db
    .insert(courses)
    .values({
      teacherId: teacher.id,
      gradeId: link[0].gradeId,
      subjectId: link[0].subjectId,
      title: parsed.data.title,
      slug: slugify(parsed.data.title),
      description: parsed.data.description,
      price: String(parsed.data.price),
      currency: parsed.data.currency,
    })
    .returning({ id: courses.id });

  await logAudit(teacher.id, "CREATE", "course", created.id, { title: parsed.data.title });
  revalidatePath("/dashboard/teacher/courses");
  redirect(`/dashboard/teacher/courses/${created.id}`);
}

export async function updateCourseAction(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  await assertCourseOwnership(courseId, teacher.id, teacher.role);

  const parsed = courseSchema.partial({ gradeSubjectId: true }).safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    price: formData.get("price") || 0,
    currency: formData.get("currency") || "EGP",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  await db
    .update(courses)
    .set({
      title: parsed.data.title,
      description: parsed.data.description,
      price: String(parsed.data.price),
      currency: parsed.data.currency,
      thumbnailUrl: (formData.get("thumbnailUrl") as string) || undefined,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, courseId));

  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
  return { success: "تم تحديث بيانات الكورس" };
}

export async function setCourseStatusAction(courseId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const teacher = await requireRole("TEACHER", "ADMIN");
  await assertCourseOwnership(courseId, teacher.id, teacher.role);
  await db.update(courses).set({ status, updatedAt: new Date() }).where(eq(courses.id, courseId));
  await logAudit(teacher.id, "STATUS_CHANGE", "course", courseId, { status });
  if (status === "PUBLISHED") {
    await notifyEnrolledStudents(courseId, "ANNOUNCEMENT", "تم تحديث الكورس", "تمت إضافة محتوى جديد للكورس");
  }
  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
  revalidatePath("/explore");
}

export async function deleteCourseAction(courseId: string) {
  const teacher = await requireRole("TEACHER", "ADMIN");
  await assertCourseOwnership(courseId, teacher.id, teacher.role);
  await db.delete(courses).where(eq(courses.id, courseId));
  revalidatePath("/dashboard/teacher/courses");
  redirect("/dashboard/teacher/courses");
}

// ---------------- Modules ----------------
export async function createModuleAction(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  await assertCourseOwnership(courseId, teacher.id, teacher.role);
  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "عنوان الوحدة مطلوب" };

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId));

  await db.insert(courseModules).values({ courseId, title, order: count });
  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
  return { success: "تم إضافة الوحدة" };
}

export async function updateModuleAction(moduleId: string, title: string) {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(courseModules).where(eq(courseModules.id, moduleId)).limit(1);
  if (!rows.length) return;
  await assertCourseOwnership(rows[0].courseId, teacher.id, teacher.role);
  await db.update(courseModules).set({ title }).where(eq(courseModules.id, moduleId));
  revalidatePath(`/dashboard/teacher/courses/${rows[0].courseId}`);
}

export async function deleteModuleAction(moduleId: string) {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(courseModules).where(eq(courseModules.id, moduleId)).limit(1);
  if (!rows.length) return;
  await assertCourseOwnership(rows[0].courseId, teacher.id, teacher.role);
  await db.delete(courseModules).where(eq(courseModules.id, moduleId));
  revalidatePath(`/dashboard/teacher/courses/${rows[0].courseId}`);
}

export async function reorderModuleAction(moduleId: string, direction: "up" | "down") {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(courseModules).where(eq(courseModules.id, moduleId)).limit(1);
  if (!rows.length) return;
  const current = rows[0];
  await assertCourseOwnership(current.courseId, teacher.id, teacher.role);

  const siblings = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, current.courseId))
    .orderBy(courseModules.order);

  const idx = siblings.findIndex((m) => m.id === moduleId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;

  const swap = siblings[swapIdx];
  await db.update(courseModules).set({ order: swap.order }).where(eq(courseModules.id, current.id));
  await db.update(courseModules).set({ order: current.order }).where(eq(courseModules.id, swap.id));
  revalidatePath(`/dashboard/teacher/courses/${current.courseId}`);
}

// ---------------- Lessons ----------------
const lessonSchema = z.object({
  title: z.string().min(2, "عنوان الدرس مطلوب"),
  description: z.string().optional(),
  type: z.enum(["VIDEO", "TEXT", "PDF", "MIXED"]),
  isFreePreview: z.coerce.boolean().optional(),
  requiresPreviousCompletion: z.coerce.boolean().optional(),
  textContent: z.string().optional(),
});

export async function createLessonAction(moduleId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const moduleRows = await db.select().from(courseModules).where(eq(courseModules.id, moduleId)).limit(1);
  if (!moduleRows.length) return { error: "الوحدة غير موجودة" };
  await assertCourseOwnership(moduleRows[0].courseId, teacher.id, teacher.role);

  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type") || "VIDEO",
    isFreePreview: formData.get("isFreePreview") === "on",
    requiresPreviousCompletion: formData.get("requiresPreviousCompletion") !== "off",
    textContent: formData.get("textContent") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId));

  await db.insert(lessons).values({
    moduleId,
    title: parsed.data.title,
    description: parsed.data.description,
    type: parsed.data.type,
    isFreePreview: parsed.data.isFreePreview ?? false,
    requiresPreviousCompletion: parsed.data.requiresPreviousCompletion ?? true,
    textContent: parsed.data.textContent,
    order: count,
  });

  revalidatePath(`/dashboard/teacher/courses/${moduleRows[0].courseId}`);
  return { success: "تم إضافة الدرس" };
}

export async function updateLessonAction(lessonId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db
    .select({ lesson: lessons, module: courseModules })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!rows.length) return { error: "الدرس غير موجود" };
  await assertCourseOwnership(rows[0].module.courseId, teacher.id, teacher.role);

  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type") || rows[0].lesson.type,
    isFreePreview: formData.get("isFreePreview") === "on",
    requiresPreviousCompletion: formData.get("requiresPreviousCompletion") !== "off",
    textContent: formData.get("textContent") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  await db
    .update(lessons)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(lessons.id, lessonId));

  revalidatePath(`/dashboard/teacher/courses/${rows[0].module.courseId}`);
  return { success: "تم حفظ الدرس" };
}

export async function setLessonStatusAction(lessonId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db
    .select({ lesson: lessons, module: courseModules })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!rows.length) return;
  await assertCourseOwnership(rows[0].module.courseId, teacher.id, teacher.role);
  await db.update(lessons).set({ status, updatedAt: new Date() }).where(eq(lessons.id, lessonId));

  if (status === "PUBLISHED") {
    await notifyEnrolledStudents(
      rows[0].module.courseId,
      "NEW_LESSON",
      "درس جديد متاح الآن",
      rows[0].lesson.title,
      `/dashboard/student/courses/${rows[0].module.courseId}/lessons/${lessonId}`
    );
  }
  revalidatePath(`/dashboard/teacher/courses/${rows[0].module.courseId}`);
}

export async function deleteLessonAction(lessonId: string) {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db
    .select({ lesson: lessons, module: courseModules })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!rows.length) return;
  await assertCourseOwnership(rows[0].module.courseId, teacher.id, teacher.role);
  await db.delete(lessons).where(eq(lessons.id, lessonId));
  revalidatePath(`/dashboard/teacher/courses/${rows[0].module.courseId}`);
}

export async function reorderLessonAction(lessonId: string, direction: "up" | "down") {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!rows.length) return;
  const current = rows[0];
  const moduleRows = await db.select().from(courseModules).where(eq(courseModules.id, current.moduleId)).limit(1);
  await assertCourseOwnership(moduleRows[0].courseId, teacher.id, teacher.role);

  const siblings = await db.select().from(lessons).where(eq(lessons.moduleId, current.moduleId)).orderBy(lessons.order);
  const idx = siblings.findIndex((l) => l.id === lessonId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;

  const swap = siblings[swapIdx];
  await db.update(lessons).set({ order: swap.order }).where(eq(lessons.id, current.id));
  await db.update(lessons).set({ order: current.order }).where(eq(lessons.id, swap.id));
  revalidatePath(`/dashboard/teacher/courses/${moduleRows[0].courseId}`);
}

export async function saveVideoAssetAction(lessonId: string, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db
    .select({ lesson: lessons, module: courseModules })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!rows.length) return { error: "الدرس غير موجود" };
  await assertCourseOwnership(rows[0].module.courseId, teacher.id, teacher.role);

  const provider = String(formData.get("provider") || "local");
  const storageKey = String(formData.get("storageKey") || "");
  const url = String(formData.get("url") || "");
  const originalFileName = String(formData.get("originalFileName") || "");
  const sizeBytes = String(formData.get("sizeBytes") || "0");
  const durationSeconds = Number(formData.get("durationSeconds") || 0);
  if (!storageKey || !url) return { error: "بيانات الفيديو غير مكتملة" };

  await db.delete(videoAssets).where(eq(videoAssets.lessonId, lessonId));
  await db.insert(videoAssets).values({
    lessonId,
    provider,
    storageKey,
    url,
    originalFileName,
    sizeBytes,
    durationSeconds: Math.round(durationSeconds),
    status: "READY",
  });

  revalidatePath(`/dashboard/teacher/courses/${rows[0].module.courseId}`);
  return { success: "تم رفع الفيديو بنجاح" };
}

export async function saveLessonFileAction(lessonId: string, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db
    .select({ lesson: lessons, module: courseModules })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!rows.length) return { error: "الدرس غير موجود" };
  await assertCourseOwnership(rows[0].module.courseId, teacher.id, teacher.role);

  const title = String(formData.get("title") || "ملف مرفق");
  const fileUrl = String(formData.get("fileUrl") || "");
  const fileType = String(formData.get("fileType") || "pdf");
  const sizeBytes = String(formData.get("sizeBytes") || "0");
  if (!fileUrl) return { error: "ارفع الملف أولاً" };

  await db.insert(lessonFiles).values({ lessonId, title, fileUrl, fileType, sizeBytes });
  revalidatePath(`/dashboard/teacher/courses/${rows[0].module.courseId}`);
  return { success: "تمت إضافة الملف" };
}

export async function deleteVideoAssetAction(videoId: string) {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db
    .select({ video: videoAssets, lesson: lessons, module: courseModules })
    .from(videoAssets)
    .innerJoin(lessons, eq(videoAssets.lessonId, lessons.id))
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(eq(videoAssets.id, videoId))
    .limit(1);
  if (!rows.length) return;
  await assertCourseOwnership(rows[0].module.courseId, teacher.id, teacher.role);
  await deleteObject(rows[0].video.storageKey);
  await db.delete(videoAssets).where(eq(videoAssets.id, videoId));
  revalidatePath(`/dashboard/teacher/courses/${rows[0].module.courseId}`);
}

export async function deleteLessonFileAction(fileId: string) {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db
    .select({ file: lessonFiles, lesson: lessons, module: courseModules })
    .from(lessonFiles)
    .innerJoin(lessons, eq(lessonFiles.lessonId, lessons.id))
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(eq(lessonFiles.id, fileId))
    .limit(1);
  if (!rows.length) return;
  await assertCourseOwnership(rows[0].module.courseId, teacher.id, teacher.role);
  await deleteObject(rows[0].file.fileUrl);
  await db.delete(lessonFiles).where(eq(lessonFiles.id, fileId));
  revalidatePath(`/dashboard/teacher/courses/${rows[0].module.courseId}`);
}
