"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  educationSystems,
  academicYears,
  educationalStages,
  grades,
  subjects,
  gradeSubjects,
  teacherSubjectOfferings,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { logAudit } from "@/lib/notifications";

export type ActionState = { error?: string; success?: string } | null;

function revalidateAcademic() {
  revalidatePath("/dashboard/admin/academic");
  revalidatePath("/explore");
  revalidatePath("/");
}

// ---------------- Education Systems ----------------
export async function createEducationSystemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "اسم النظام التعليمي مطلوب" };
  await db.insert(educationSystems).values({ name, description: String(formData.get("description") || "") });
  await logAudit(admin.id, "CREATE", "education_system", undefined, { name });
  revalidateAcademic();
  return { success: "تم إضافة النظام التعليمي" };
}

export async function toggleEducationSystemAction(id: string, isActive: boolean) {
  await requireRole("ADMIN");
  await db.update(educationSystems).set({ isActive }).where(eq(educationSystems.id, id));
  revalidateAcademic();
}

export async function deleteEducationSystemAction(id: string) {
  await requireRole("ADMIN");
  await db.delete(educationSystems).where(eq(educationSystems.id, id));
  revalidateAcademic();
}

// ---------------- Academic Years ----------------
export async function createAcademicYearAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const systemId = String(formData.get("systemId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!systemId || !name) return { error: "بيانات ناقصة" };
  await requireRole("ADMIN");
  await db.insert(academicYears).values({ systemId, name });
  revalidateAcademic();
  return { success: "تم إضافة السنة الدراسية" };
}

export async function toggleAcademicYearAction(id: string, isActive: boolean) {
  await requireRole("ADMIN");
  await db.update(academicYears).set({ isActive }).where(eq(academicYears.id, id));
  revalidateAcademic();
}

export async function deleteAcademicYearAction(id: string) {
  await requireRole("ADMIN");
  await db.delete(academicYears).where(eq(academicYears.id, id));
  revalidateAcademic();
}

// ---------------- Educational Stages ----------------
export async function createStageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const yearId = String(formData.get("yearId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!yearId || !name) return { error: "بيانات ناقصة" };
  await requireRole("ADMIN");
  await db.insert(educationalStages).values({ yearId, name });
  revalidateAcademic();
  return { success: "تم إضافة المرحلة التعليمية" };
}

export async function toggleStageAction(id: string, isActive: boolean) {
  await requireRole("ADMIN");
  await db.update(educationalStages).set({ isActive }).where(eq(educationalStages.id, id));
  revalidateAcademic();
}

export async function deleteStageAction(id: string) {
  await requireRole("ADMIN");
  await db.delete(educationalStages).where(eq(educationalStages.id, id));
  revalidateAcademic();
}

// ---------------- Grades ----------------
const gradeSchema = z.object({
  stageId: z.string().uuid(),
  name: z.string().min(2),
});

export async function createGradeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("ADMIN");
  const parsed = gradeSchema.safeParse({ stageId: formData.get("stageId"), name: formData.get("name") });
  if (!parsed.success) return { error: "بيانات ناقصة" };
  await db.insert(grades).values({
    stageId: parsed.data.stageId,
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
  });
  revalidateAcademic();
  return { success: "تم إضافة الصف الدراسي" };
}

export async function toggleGradeAction(id: string, isActive: boolean) {
  await requireRole("ADMIN");
  await db.update(grades).set({ isActive }).where(eq(grades.id, id));
  revalidateAcademic();
}

export async function reorderGradeAction(id: string, order: number) {
  await requireRole("ADMIN");
  await db.update(grades).set({ order }).where(eq(grades.id, id));
  revalidateAcademic();
}

export async function deleteGradeAction(id: string) {
  await requireRole("ADMIN");
  await db.delete(grades).where(eq(grades.id, id));
  revalidateAcademic();
}

// ---------------- Subjects ----------------
const subjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function createSubjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("ADMIN");
  const parsed = subjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) return { error: "اسم المادة مطلوب" };
  await db.insert(subjects).values({
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
    description: parsed.data.description,
    icon: parsed.data.icon || "book",
    color: parsed.data.color || "primary",
  });
  revalidateAcademic();
  return { success: "تم إضافة المادة الدراسية" };
}

export async function toggleSubjectAction(id: string, isActive: boolean) {
  await requireRole("ADMIN");
  await db.update(subjects).set({ isActive }).where(eq(subjects.id, id));
  revalidateAcademic();
}

export async function deleteSubjectAction(id: string) {
  await requireRole("ADMIN");
  await db.delete(subjects).where(eq(subjects.id, id));
  revalidateAcademic();
}

// ---------------- Grade <-> Subject links ----------------
export async function linkGradeSubjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("ADMIN");
  const gradeId = String(formData.get("gradeId") || "");
  const subjectId = String(formData.get("subjectId") || "");
  if (!gradeId || !subjectId) return { error: "اختر الصف والمادة" };
  try {
    await db.insert(gradeSubjects).values({ gradeId, subjectId });
  } catch {
    return { error: "هذا الربط موجود بالفعل" };
  }
  revalidateAcademic();
  return { success: "تم ربط المادة بالصف الدراسي" };
}

export async function unlinkGradeSubjectAction(id: string) {
  await requireRole("ADMIN");
  await db.delete(gradeSubjects).where(eq(gradeSubjects.id, id));
  revalidateAcademic();
}

// ---------------- Teacher subject offerings ----------------
export async function assignTeacherToSubjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("ADMIN");
  const teacherId = String(formData.get("teacherId") || "");
  const subjectId = String(formData.get("subjectId") || "");
  const gradeId = String(formData.get("gradeId") || "");
  if (!teacherId || !subjectId || !gradeId) return { error: "بيانات ناقصة" };
  await db.insert(teacherSubjectOfferings).values({ teacherId, subjectId, gradeId });
  revalidateAcademic();
  return { success: "تم تعيين المستر للمادة" };
}
