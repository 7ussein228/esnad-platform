"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type ActionState } from "@/server/actions/auth";
import { Button, Input, Label, Alert } from "@/components/ui";
import { FirebaseAuthButtons } from "@/components/firebase-auth";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(registerAction, null);

  return (
    <div className="space-y-6">
    <form action={formAction} className="space-y-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {/* single-teacher mode: fixed STUDENT role, no role picker */}
      <input type="hidden" name="role" value="STUDENT" />
      <div>
        <Label>الاسم بالكامل</Label>
        <Input type="text" name="name" placeholder="اكتب اسمك" required />
      </div>
      <div>
        <Label>البريد الإلكتروني</Label>
        <Input type="email" name="email" placeholder="example@mail.com" required dir="ltr" />
      </div>
      <div>
        <Label>كلمة المرور</Label>
        <Input type="password" name="password" placeholder="6 أحرف على الأقل" required minLength={6} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
      </Button>
      <p className="text-center text-sm text-ink-500">
        لديك حساب بالفعل؟{" "}
        <Link href="/login" className="font-bold text-primary-700 hover:underline">
          سجل الدخول
        </Link>
      </p>
    </form>
      <div className="flex items-center gap-3 text-xs text-ink-400">
        <span className="h-px flex-1 bg-ink-200" />
        أو سجل عبر
        <span className="h-px flex-1 bg-ink-200" />
      </div>
      <FirebaseAuthButtons />
    </div>
  );
}
