"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type ActionState } from "@/server/actions/auth";
import { Button, Input, Label, Alert } from "@/components/ui";
import { FirebaseAuthButtons } from "@/components/firebase-auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(loginAction, null);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <div>
        <Label>البريد الإلكتروني</Label>
        <Input type="email" name="email" placeholder="example@mail.com" required dir="ltr" />
      </div>
      <div>
        <Label>كلمة المرور</Label>
        <Input type="password" name="password" placeholder="••••••••" required />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "جارٍ الدخول..." : "تسجيل الدخول"}
      </Button>
      <p className="text-center text-sm text-ink-500">
        ليس لديك حساب؟{" "}
        <Link href="/register" className="font-bold text-primary-700 hover:underline">
          أنشئ حسابًا جديدًا
        </Link>
      </p>
      </form>
      <div className="flex items-center gap-3 text-xs text-ink-400">
        <span className="h-px flex-1 bg-ink-200" />
        أو ادخل عبر
        <span className="h-px flex-1 bg-ink-200" />
      </div>
      <FirebaseAuthButtons />
    </div>
  );
}
