"use client";

import { useActionState } from "react";
import { updateProfileAction, changePasswordAction, type ActionState } from "@/server/actions/auth";
import { Button, Input, Textarea, Label, Alert } from "@/components/ui";

export function ProfileInfoForm({ name, phone, bio }: { name: string; phone: string | null; bio: string | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateProfileAction, null);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <div>
        <Label>الاسم</Label>
        <Input name="name" defaultValue={name} required />
      </div>
      <div>
        <Label>رقم الهاتف</Label>
        <Input name="phone" defaultValue={phone ?? ""} dir="ltr" />
      </div>
      <div>
        <Label>نبذة تعريفية</Label>
        <Textarea name="bio" defaultValue={bio ?? ""} rows={3} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(changePasswordAction, null);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <div>
        <Label>كلمة المرور الحالية</Label>
        <Input type="password" name="currentPassword" required />
      </div>
      <div>
        <Label>كلمة المرور الجديدة</Label>
        <Input type="password" name="newPassword" minLength={6} required />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "جارٍ التغيير..." : "تغيير كلمة المرور"}</Button>
    </form>
  );
}
