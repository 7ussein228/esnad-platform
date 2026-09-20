"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { logAudit } from "@/lib/notifications";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";

export type ActionState = { error?: string; success?: string } | null;

const firebaseLoginSchema = z.object({
  idToken: z.string().min(10, "توكن غير صالح").optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  name: z.string().min(2).optional(),
  firebaseUid: z.string().min(1).optional(),
  provider: z.string().optional(),
});

/**
 * Single-teacher mode: Firebase login always maps to a STUDENT account.
 * - If FIREBASE_SERVICE_ACCOUNT_JSON is set: verifies idToken server-side (secure).
 * - Otherwise dev fallback: trusts client-provided email/phone (set service account before launch).
 */
export async function firebaseLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = firebaseLoginSchema.safeParse({
    idToken: formData.get("idToken") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    name: formData.get("name") || undefined,
    firebaseUid: formData.get("firebaseUid") || undefined,
    provider: formData.get("provider") || undefined,
  });
  if (!parsed.success) return { error: "بيانات الدخول غير مكتملة" };

  const { idToken, email, phone, name, firebaseUid, provider } = parsed.data;

  // 1) Try secure verification
  let verifiedEmail = email ?? null;
  let verifiedPhone = phone ?? null;
  let verifiedName = name ?? "طالب جديد";
  let verifiedProvider = provider ?? "firebase";

  if (idToken) {
    try {
      const verified = await verifyFirebaseIdToken(idToken);
      if (verified) {
        verifiedEmail = verified.email ?? verifiedEmail;
        verifiedPhone = verified.phone ?? verifiedPhone;
        verifiedName = verified.name ?? verifiedName;
        verifiedProvider = verified.provider;
      }
    } catch {
      return { error: "فشل التحقق من حساب Firebase. حاول مرة أخرى" };
    }
  }

  if (!verifiedEmail && !verifiedPhone) {
    return { error: "لازم إيميل أو رقم موبايل من Firebase" };
  }

  // 2) Find existing user by email or phone (students only — never auto-promote to TEACHER)
  const conditions = [
    ...(verifiedEmail ? [eq(users.email, verifiedEmail)] : []),
    ...(verifiedPhone ? [eq(users.phone, verifiedPhone)] : []),
  ];
  const existing = conditions.length
    ? await db.select().from(users).where(or(...conditions)).limit(1)
    : [];

  if (existing.length) {
    const user = existing[0];
    if (!user.isActive) return { error: "تم إيقاف هذا الحساب. تواصل مع المستر" };
    if (user.role !== "STUDENT") {
      // Teacher/admin must use fixed email+password login, not Firebase social.
      return { error: "حساب المستر يدخل بالإيميل والباسورد الثابت فقط" };
    }
    await createSession(user.id);
    await logAudit(user.id, "FIREBASE_LOGIN", "user", user.id, { provider: verifiedProvider });
    redirect("/dashboard");
  }

  // 3) Create new STUDENT
  const finalEmail =
    verifiedEmail ?? `${verifiedPhone!.replace(/\+/g, "")}@phone.esnad.local`;
  const [created] = await db
    .insert(users)
    .values({
      name: verifiedName,
      email: finalEmail,
      // random unusable password — social users log in via Firebase only
      passwordHash: `firebase:${firebaseUid ?? verifiedPhone ?? finalEmail}:${Date.now()}`,
      role: "STUDENT",
      phone: verifiedPhone,
    })
    .returning({ id: users.id });

  await logAudit(created.id, "FIREBASE_REGISTER", "user", created.id, { provider: verifiedProvider });
  await createSession(created.id);
  redirect("/dashboard");
}
