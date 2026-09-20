"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Alert } from "@/components/ui";

export type GradeOption = { id: string; name: string };

export const PENDING_REGISTRATION_KEY = "esnad_pending_registration";

export type PendingRegistration = {
  name: string;
  gradeId: string;
  gradeName: string;
  email: string;
  phone: string;
};

// Step 1 of registration: name + grade + email + phone.
// On submit the data is staged in sessionStorage and the student
// moves to /register/verify (OTP page) to confirm the phone number.
export function RegisterForm({ grades }: { grades: GradeOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);

    const name = String(data.get("name") || "").trim();
    const gradeId = String(data.get("gradeId") || "");
    const email = String(data.get("email") || "").trim();
    let phone = String(data.get("phone") || "").trim().replace(/[\s-]/g, "");

    if (name.length < 3) return setError("اكتب الاسم بالكامل (3 أحرف على الأقل)");
    if (!gradeId) return setError("اختار السنة الدراسية بتاعتك");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError("البريد الإلكتروني غير صحيح");
    // Normalize Egyptian numbers: 01xxxxxxxxx -> +201xxxxxxxxx
    if (/^01\d{9}$/.test(phone)) phone = "+2" + phone;
    if (!/^\+\d{8,15}$/.test(phone)) return setError("اكتب رقم الموبايل صحيح (مثال: 010xxxxxxxx أو +2010xxxxxxxx)");

    const gradeName = grades.find((g) => g.id === gradeId)?.name ?? "";
    const pending: PendingRegistration = { name, gradeId, gradeName, email, phone };
    sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending));
    router.push("/register/verify");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      <div>
        <Label>الاسم بالكامل</Label>
        <Input type="text" name="name" placeholder="اكتب اسمك" required minLength={3} />
      </div>
      <div>
        <Label>انت في سنة كام؟</Label>
        <Select name="gradeId" required defaultValue="">
          <option value="" disabled>اختار السنة الدراسية</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>الإيميل</Label>
        <Input type="email" name="email" placeholder="example@mail.com" required dir="ltr" />
      </div>
      <div>
        <Label>رقم الموبايل</Label>
        <Input type="tel" name="phone" placeholder="010xxxxxxxx" required dir="ltr" />
        <p className="mt-1 text-[11px] text-ink-400">هيتبعت عليه كود تحقق (OTP) في الخطوة الجاية.</p>
      </div>
      <Button type="submit" className="w-full" size="lg">
        التالي: تحقق من الموبايل
      </Button>
      <p className="text-center text-sm text-ink-500">
        لديك حساب بالفعل؟{" "}
        <Link href="/login" className="font-bold text-primary-700 hover:underline">
          سجل الدخول
        </Link>
      </p>
    </form>
  );
}
