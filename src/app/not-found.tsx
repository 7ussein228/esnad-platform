import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pattern-motif flex min-h-screen items-center justify-center bg-papyrus-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-ink-200 bg-white p-10 text-center shadow-xl">
        <p className="font-display text-6xl font-bold text-primary-600">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">الصفحة مش موجودة</h1>
        <p className="mt-2 text-sm text-ink-500">
          اللينك اللي دخلت عليه غلط أو الصفحة اتنقلت. ارجع للرئيسية وكمل رحلتك.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700"
          >
            الرئيسية
          </Link>
          <Link
            href="/explore"
            className="rounded-xl border border-ink-200 px-6 py-2.5 text-sm font-bold text-ink-700 transition hover:border-primary-400"
          >
            استكشف الكورسات
          </Link>
        </div>
      </div>
    </div>
  );
}
