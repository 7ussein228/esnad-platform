import Link from "next/link";
import type { Metadata } from "next";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "تحقق من رقم الموبايل", robots: { index: false, follow: false } };

export default function RegisterVerifyPage() {
  return (
    <div className="pattern-motif flex min-h-screen items-center justify-center bg-papyrus-100 px-4 py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-2xl lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-primary-700 to-primary-900 p-10 text-white lg:flex">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-400 font-display text-xl font-bold text-ink-900">إ</span>
            <span className="font-display text-lg font-bold">منصة إسناد</span>
          </Link>
          <div>
            <p className="font-display text-3xl font-bold leading-snug">خطوة واحدة وتخلص</p>
            <p className="mt-4 text-primary-100">اكتب الكود اللي وصلك على موبايلك عشان نأكد رقمك ونفعل حسابك.</p>
          </div>
          <p className="text-xs text-primary-200">من الإعدادي إلى البكالوريا</p>
        </div>

        <div className="p-8 sm:p-12">
          <div className="mb-6 flex items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">✓ بياناتك</span>
            <span className="h-px flex-1 bg-ink-200" />
            <span className="rounded-full bg-primary-600 px-3 py-1 text-white">2 كود الموبايل</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900">تحقق من رقم الموبايل</h1>
          <p className="mt-1 text-sm text-ink-500">هيتبعت كود (OTP) على رقمك — اكتبه هنا</p>
          <div className="mt-8">
            <VerifyForm />
          </div>
        </div>
      </div>
    </div>
  );
}
