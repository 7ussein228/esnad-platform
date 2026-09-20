"use client";

import { useActionState } from "react";
import { markNotificationReadAction, markAllNotificationsReadAction, createAnnouncementAction, deleteAnnouncementAction, type ActionState } from "@/server/actions/content-extras";
import { Button, Input, Textarea, Label, Select, Alert, Card } from "@/components/ui";
import { ActionButton, ConfirmSubmitButton } from "@/components/client-widgets";
import { formatDateTime } from "@/lib/utils";

export function MarkAllReadButton() {
  return (
    <ActionButton action={() => markAllNotificationsReadAction()} className="text-xs font-bold text-primary-700 hover:underline">
      تحديد الكل كمقروء
    </ActionButton>
  );
}

export function NotificationItem({ id, title, body, isRead, createdAt, link }: { id: string; title: string; body: string | null; isRead: boolean; createdAt: Date | string; link?: string | null }) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${isRead ? "border-ink-100 bg-white" : "border-primary-200 bg-primary-50/50"}`}>
      <div>
        <p className="font-bold text-ink-800">{title}</p>
        {body && <p className="mt-1 text-sm text-ink-500">{body}</p>}
        <p className="mt-2 text-xs text-ink-400">{formatDateTime(createdAt)}</p>
      </div>
      {!isRead && (
        <ActionButton action={() => markNotificationReadAction(id)} className="shrink-0 text-xs font-bold text-primary-700 hover:underline">
          تحديد كمقروء
        </ActionButton>
      )}
    </div>
  );
}

export function AnnouncementCard({ id, title, body, createdAt, canDelete }: { id: string; title: string; body: string; createdAt: Date | string; canDelete: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-ink-800">{title}</p>
          <p className="mt-1 text-sm text-ink-500">{body}</p>
          <p className="mt-2 text-xs text-ink-400">{formatDateTime(createdAt)}</p>
        </div>
        {canDelete && (
          <ConfirmSubmitButton
            action={() => deleteAnnouncementAction(id)}
            confirmMessage="هل تريد حذف هذا الإعلان؟"
            className="shrink-0 text-xs font-bold text-red-600 hover:underline"
          >
            حذف
          </ConfirmSubmitButton>
        )}
      </div>
    </Card>
  );
}

export function CreateAnnouncementForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAnnouncementAction, null);
  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <div>
        <Label>العنوان</Label>
        <Input name="title" required />
      </div>
      <div>
        <Label>المحتوى</Label>
        <Textarea name="body" rows={3} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>الفئة المستهدفة</Label>
          <Select name="targetType" defaultValue="ALL">
            <option value="ALL">كل الطلاب</option>
            <option value="COURSE">كورس محدد</option>
          </Select>
        </div>
        <div>
          <Label>الكورس (اختياري)</Label>
          <Select name="targetCourseId">
            <option value="">— بدون تحديد —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={pending}>{pending ? "جارٍ النشر..." : "نشر الإعلان"}</Button>
    </form>
  );
}
