"use client";

import { useActionState } from "react";
import { gradeSubmissionAction, type ActionState } from "@/server/actions/assignments";
import { Button, Input, Alert } from "@/components/ui";

export function GradeForm({ submissionId, currentGrade, maxScore }: { submissionId: string; currentGrade: number | null; maxScore: number }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    gradeSubmissionAction.bind(null, submissionId),
    null
  );

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <div>
        <label className="text-[11px] font-bold text-ink-500">الدرجة (من {maxScore})</label>
        <Input name="grade" type="number" min={0} max={maxScore} defaultValue={currentGrade ?? ""} required dir="ltr" className="w-24" />
      </div>
      <div className="min-w-[200px] flex-1">
        <label className="text-[11px] font-bold text-ink-500">ملاحظات للمستر (اختياري)</label>
        <Input name="feedback" placeholder="أحسنت، راجع النقطة..." />
      </div>
      <Button type="submit" size="sm" disabled={pending}>{pending ? "جارٍ..." : "حفظ الدرجة"}</Button>
    </form>
  );
}
