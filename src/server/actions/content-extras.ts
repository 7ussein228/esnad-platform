"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  notifications,
  historicalTimelines,
  historicalEvents,
  historicalCharacters,
  historicalDocuments,
  historicalMaps,
  geographyResources,
} from "@/db/schema";
import { requireRole, requireUser } from "@/lib/auth";
import { notifyEnrolledStudents } from "@/lib/notifications";
import { db as database } from "@/db";

export type ActionState = { error?: string; success?: string } | null;

// ---------------- Announcements ----------------
export async function createAnnouncementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const author = await requireRole("TEACHER", "ADMIN");
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const targetType = String(formData.get("targetType") || "ALL") as "ALL" | "COURSE" | "GRADE" | "SUBJECT";
  const targetCourseId = String(formData.get("targetCourseId") || "") || null;
  const targetGradeId = String(formData.get("targetGradeId") || "") || null;
  const targetSubjectId = String(formData.get("targetSubjectId") || "") || null;

  if (!title || !body) return { error: "العنوان والمحتوى مطلوبان" };

  await db.insert(announcements).values({
    authorId: author.id,
    title,
    body,
    targetType,
    targetCourseId,
    targetGradeId,
    targetSubjectId,
  });

  if (targetType === "COURSE" && targetCourseId) {
    await notifyEnrolledStudents(targetCourseId, "ANNOUNCEMENT", title, body);
  }

  revalidatePath("/dashboard/updates");
  return { success: "تم نشر الإعلان" };
}

export async function deleteAnnouncementAction(id: string) {
  const user = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
  if (!rows.length) return;
  if (user.role !== "ADMIN" && rows[0].authorId !== user.id) return;
  await db.delete(announcements).where(eq(announcements.id, id));
  revalidatePath("/dashboard/updates");
}

// ---------------- Notifications ----------------
export async function markNotificationReadAction(id: string) {
  const user = await requireUser();
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  revalidatePath("/dashboard/updates");
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await database.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
  revalidatePath("/dashboard/updates");
}

// ---------------- Historical resources ----------------
async function assertTeacherOrAdmin() {
  return requireRole("TEACHER", "ADMIN");
}

export async function createTimelineAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertTeacherOrAdmin();
  const subjectId = String(formData.get("subjectId") || "");
  const gradeId = String(formData.get("gradeId") || "");
  const title = String(formData.get("title") || "").trim();
  if (!subjectId || !gradeId || !title) return { error: "بيانات ناقصة" };
  await db.insert(historicalTimelines).values({ subjectId, gradeId, title, description: String(formData.get("description") || "") });
  revalidatePath("/dashboard/teacher/resources");
  return { success: "تم إنشاء الخط الزمني" };
}

export async function createEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertTeacherOrAdmin();
  const timelineId = String(formData.get("timelineId") || "");
  const title = String(formData.get("title") || "").trim();
  if (!timelineId || !title) return { error: "بيانات ناقصة" };
  await db.insert(historicalEvents).values({
    timelineId,
    title,
    periodLabel: String(formData.get("periodLabel") || ""),
    eventDate: String(formData.get("eventDate") || ""),
    description: String(formData.get("description") || ""),
    causes: String(formData.get("causes") || ""),
    effects: String(formData.get("effects") || ""),
  });
  revalidatePath("/dashboard/teacher/resources");
  return { success: "تمت إضافة الحدث التاريخي" };
}

export async function createCharacterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertTeacherOrAdmin();
  const subjectId = String(formData.get("subjectId") || "");
  const gradeId = String(formData.get("gradeId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!subjectId || !gradeId || !name) return { error: "بيانات ناقصة" };
  await db.insert(historicalCharacters).values({
    subjectId,
    gradeId,
    name,
    title: String(formData.get("title") || ""),
    era: String(formData.get("era") || ""),
    bio: String(formData.get("bio") || ""),
    achievements: String(formData.get("achievements") || ""),
  });
  revalidatePath("/dashboard/teacher/resources");
  return { success: "تمت إضافة الشخصية التاريخية" };
}

export async function createDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertTeacherOrAdmin();
  const subjectId = String(formData.get("subjectId") || "");
  const gradeId = String(formData.get("gradeId") || "");
  const title = String(formData.get("title") || "").trim();
  const fileUrl = String(formData.get("fileUrl") || "").trim();
  if (!subjectId || !gradeId || !title || !fileUrl) return { error: "بيانات ناقصة، ارفع الملف أولاً" };
  await db.insert(historicalDocuments).values({
    subjectId,
    gradeId,
    title,
    description: String(formData.get("description") || ""),
    fileUrl,
    fileType: String(formData.get("fileType") || "pdf"),
  });
  revalidatePath("/dashboard/teacher/resources");
  return { success: "تمت إضافة الوثيقة التاريخية" };
}

export async function createMapAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertTeacherOrAdmin();
  const subjectId = String(formData.get("subjectId") || "");
  const gradeId = String(formData.get("gradeId") || "");
  const title = String(formData.get("title") || "").trim();
  const imageUrl = String(formData.get("imageUrl") || "").trim();
  if (!subjectId || !gradeId || !title || !imageUrl) return { error: "بيانات ناقصة، ارفع الصورة أولاً" };
  await db.insert(historicalMaps).values({
    subjectId,
    gradeId,
    title,
    description: String(formData.get("description") || ""),
    imageUrl,
    era: String(formData.get("era") || ""),
  });
  revalidatePath("/dashboard/teacher/resources");
  return { success: "تمت إضافة الخريطة التاريخية" };
}

export async function createGeographyResourceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertTeacherOrAdmin();
  const subjectId = String(formData.get("subjectId") || "");
  const gradeId = String(formData.get("gradeId") || "");
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "region");
  if (!subjectId || !gradeId || !title) return { error: "بيانات ناقصة" };
  await db.insert(geographyResources).values({
    subjectId,
    gradeId,
    category,
    title,
    content: String(formData.get("content") || ""),
    imageUrl: String(formData.get("imageUrl") || "") || undefined,
  });
  revalidatePath("/dashboard/teacher/resources");
  return { success: "تمت إضافة المورد الجغرافي" };
}

export async function deleteResourceAction(table: string, id: string) {
  await assertTeacherOrAdmin();
  switch (table) {
    case "timeline":
      await db.delete(historicalTimelines).where(eq(historicalTimelines.id, id));
      break;
    case "event":
      await db.delete(historicalEvents).where(eq(historicalEvents.id, id));
      break;
    case "character":
      await db.delete(historicalCharacters).where(eq(historicalCharacters.id, id));
      break;
    case "document":
      await db.delete(historicalDocuments).where(eq(historicalDocuments.id, id));
      break;
    case "map":
      await db.delete(historicalMaps).where(eq(historicalMaps.id, id));
      break;
    case "geography":
      await db.delete(geographyResources).where(eq(geographyResources.id, id));
      break;
  }
  revalidatePath("/dashboard/teacher/resources");
}
