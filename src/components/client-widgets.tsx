"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function ConfirmSubmitButton({
  action,
  confirmMessage,
  className,
  children,
}: {
  action: () => Promise<void> | void;
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(async () => {
            await action();
          });
        }
      }}
    >
      {pending ? "جارٍ التنفيذ..." : children}
    </button>
  );
}

export function ActionButton({
  action,
  className,
  children,
  pendingText = "جارٍ التنفيذ...",
}: {
  action: () => Promise<void> | void;
  className?: string;
  children: ReactNode;
  pendingText?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => startTransition(async () => { await action(); })}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function CountdownTimer({ minutes, onExpire }: { minutes: number; onExpire?: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);

  useEffect(() => {
    if (minutes <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [minutes, onExpire]);

  if (minutes <= 0) return null;

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const isLow = secondsLeft < 60;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-lg font-bold ${
        isLow ? "border-red-300 bg-red-50 text-red-700" : "border-primary-200 bg-primary-50 text-primary-700"
      }`}
    >
      ⏱ {mm}:{ss.toString().padStart(2, "0")}
    </div>
  );
}

export function TimerWithAutoSubmit({ minutes, formId }: { minutes: number; formId: string }) {
  return (
    <CountdownTimer
      minutes={minutes}
      onExpire={() => {
        const form = document.getElementById(formId) as HTMLFormElement | null;
        form?.requestSubmit();
      }}
    />
  );
}

export function RefreshOnMount() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return null;
}
