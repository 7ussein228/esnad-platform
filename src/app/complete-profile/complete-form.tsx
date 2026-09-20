"use client";

import { useActionState } from "react";
import { completeProfileAction, type ActionState } from "@/server/actions/firebase-auth";
import { Button, Input, Label, Select, Alert } from "@/components/ui";
import type { GradeOption } from "@/app/register/register-form";

export function CompleteProfileForm({ grades }: { grades: GradeOption[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(completeProfileAction, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
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
        <Label>رقم الموبايل</Label>
        <Input type="tel" name="phone" placeholder="010xxxxxxxx" required dir="ltr" />
      </div>
      <div>
        <Label>كلمة المرور <span className="font-normal text-ink-400">(اختياري — عشان تدخل بالإيميل بعد كده)</span></Label>
        <Input type="password" name="password" placeholder="6 أحرف على الأقل" minLength={6} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "جارٍ الحفظ..." : "حفظ وادخل المنصة"}
      </Button>
    </form>
  );
}
