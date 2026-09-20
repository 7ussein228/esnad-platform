"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, courses, platformSettings } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/notifications";

export type ActionState = { error?: string; success?: string } | null;

export async function createUserByAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "STUDENT") as "STUDENT" | "TEACHER" | "ADMIN";

  if (!name || !email || password.length < 6) return { error: "بيانات غير صحيحة (كلمة المرور 6 أحرف على الأقل)" };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return { error: "البريد الإلكتروني مستخدم بالفعل" };

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ name, email, passwordHash, role });
  await logAudit(admin.id, "CREATE", "user", undefined, { email, role });
  revalidatePath("/dashboard/admin/users");
  return { success: "تم إنشاء الحساب بنجاح" };
}

export async function toggleUserActiveAction(userId: string, isActive: boolean) {
  const admin = await requireRole("ADMIN");
  await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, userId));
  await logAudit(admin.id, isActive ? "ACTIVATE" : "DEACTIVATE", "user", userId);
  revalidatePath("/dashboard/admin/users");
}

export async function changeUserRoleAction(userId: string, role: "STUDENT" | "TEACHER" | "ADMIN") {
  const admin = await requireRole("ADMIN");
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
  await logAudit(admin.id, "ROLE_CHANGE", "user", userId, { role });
  revalidatePath("/dashboard/admin/users");
}

export async function setCourseModerationStatusAction(courseId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const admin = await requireRole("ADMIN");
  await db.update(courses).set({ status, updatedAt: new Date() }).where(eq(courses.id, courseId));
  await logAudit(admin.id, "MODERATE_COURSE", "course", courseId, { status });
  revalidatePath("/dashboard/admin/courses");
}

export async function updatePlatformSettingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const key = String(formData.get("key") || "");
  const value = String(formData.get("value") || "");
  if (!key) return { error: "المفتاح مطلوب" };

  await db
    .insert(platformSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });

  await logAudit(admin.id, "UPDATE_SETTING", "platform_setting", key, { value });
  revalidatePath("/dashboard/admin");
  return { success: "تم حفظ الإعداد" };
}
