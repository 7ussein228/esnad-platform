"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { checkRateLimit, clientIp, LOGIN_LIMIT, REGISTER_LIMIT } from "@/lib/rate-limit";
import { logAudit } from "@/lib/notifications";

export type ActionState = { error?: string; success?: string } | null;

const registerSchema = z.object({
  name: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

// single-teacher mode: public registration always creates a STUDENT.
// Teacher account is fixed via seed / ENV (TEACHER_EMAIL) and can never self-register.

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const { name, email, password } = parsed.data;
  const role = "STUDENT" as const;

  const rl = checkRateLimit(`register:${await clientIp()}`, REGISTER_LIMIT.limit, REGISTER_LIMIT.windowMs);
  if (!rl.allowed) {
    return { error: `محاولات كتيرة. حاول تاني بعد ${Math.ceil(rl.retryAfterSeconds / 60)} دقيقة` };
  }
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    return { error: "هذا البريد الإلكتروني مسجل بالفعل" };
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({ name, email, passwordHash, role })
    .returning({ id: users.id });

  await logAudit(created.id, "USER_REGISTERED", "user", created.id, { role });
  await createSession(created.id);
  redirect("/dashboard");
}

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const { email, password } = parsed.data;
  const rl = checkRateLimit(`login:${await clientIp()}`, LOGIN_LIMIT.limit, LOGIN_LIMIT.windowMs);
  if (!rl.allowed) {
    return { error: `محاولات كتيرة. حاول تاني بعد ${Math.ceil(rl.retryAfterSeconds / 60)} دقيقة` };
  }

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!rows.length) return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };

  const user = rows[0];
  if (!user.isActive) return { error: "تم إيقاف هذا الحساب. تواصل مع الإدارة" };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };

  await createSession(user.id);
  await logAudit(user.id, "USER_LOGIN", "user", user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await logAudit(user.id, "USER_LOGOUT", "user", user.id);
  await destroySession();
  redirect("/login");
}

const profileSchema = z.object({
  name: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    bio: formData.get("bio") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  await db
    .update(users)
    .set({ name: parsed.data.name, phone: parsed.data.phone, bio: parsed.data.bio, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return { success: "تم تحديث البيانات بنجاح" };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"),
});

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const current = rows[0];
  const valid = await verifyPassword(parsed.data.currentPassword, current.passwordHash);
  if (!valid) return { error: "كلمة المرور الحالية غير صحيحة" };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
  return { success: "تم تغيير كلمة المرور بنجاح" };
}
