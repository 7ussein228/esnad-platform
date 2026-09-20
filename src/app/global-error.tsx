"use client";

import { useEffect } from "react";
import Link from "next/link";

// Global error boundary. Never leaks stack traces or DB errors to users —
// details go to the server logs only.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-papyrus-50 font-sans text-ink-900 antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-ink-200 bg-white p-10 text-center shadow-xl">
            <h1 className="font-display text-2xl font-bold text-ink-900">حصلت مشكلة غير متوقعة</h1>
            <p className="mt-2 text-sm text-ink-500">
              فريقنا اتبلغ بالمشكلة. حاول تاني، ولو استمرت تواصل مع المستر.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={reset}
                className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700"
              >
                حاول تاني
              </button>
              <Link
                href="/"
                className="rounded-xl border border-ink-200 px-6 py-2.5 text-sm font-bold text-ink-700 transition hover:border-primary-400"
              >
                الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
