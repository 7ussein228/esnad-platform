"use client";

import { useActionState, type ReactNode } from "react";
import { Alert } from "@/components/ui";

export type FormActionState = { error?: string; success?: string } | null;

/**
 * Thin wrapper that lets Server Components use two-argument
 * (prevState, formData) server actions in a plain <form> while still
 * surfacing validation errors. For zero-arg actions use ActionButton instead.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className={className} aria-busy={pending}>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      {children}
    </form>
  );
}
