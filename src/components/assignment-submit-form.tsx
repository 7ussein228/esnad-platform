"use client";

import { useActionState } from "react";
import { submitAssignmentAction, type ActionState } from "@/server/actions/assignments";
import { GenericUrlUploader } from "@/components/uploaders";
import { Button, Label, Alert } from "@/components/ui";

export function AssignmentSubmitForm({ assignmentId }: { assignmentId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    submitAssignmentAction.bind(null, assignmentId),
    null
  );

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-xl bg-papyrus-100/60 p-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <div>
        <Label>إجابتك النصية</Label>
        <textarea
          name="textSubmission"
          rows={3}
          placeholder="اكتب إجابة الواجب هنا..."
          className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <GenericUrlUploader hiddenInputName="fileUrl" folder="submissions" accept=".pdf,.doc,.docx,image/*" label="إرفاق ملف" />
        <input name="fileName" placeholder="اسم الملف" className="rounded-lg border border-ink-200 px-3 py-2 text-xs" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>{pending ? "جارٍ الإرسال..." : "تسليم الواجب"}</Button>
    </form>
  );
}
