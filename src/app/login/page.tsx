import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <div className="pattern-motif flex min-h-screen items-center justify-center bg-papyrus-100 px-4 py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-2xl lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-primary-700 to-primary-900 p-10 text-white lg:flex">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-400 font-display text-xl font-bold text-ink-900">إ</span>
            <span className="font-display text-lg font-bold">منصة إسناد</span>
          </Link>
          <div>
            <p className="font-display text-3xl font-bold leading-snug">
              رحلتك نحو التفوق في الدراسات والتاريخ والجغرافيا تبدأ من هنا
            </p>
            <p className="mt-4 text-primary-100">دروس فيديو حقيقية، اختبارات، امتحانات، ومتابعة دقيقة لتقدمك.</p>
          </div>
          <p className="text-xs text-primary-200">من الإعدادي إلى البكالوريا</p>
        </div>

        <div className="p-8 sm:p-12">
          <h1 className="font-display text-2xl font-bold text-ink-900">تسجيل دخول الطلاب</h1>
          <p className="mt-1 text-sm text-ink-500">سجل دخولك لمتابعة رحلتك التعليمية — حساب المستر ثابت ولا يحتاج تسجيل</p>
          <div className="mt-8">
            <LoginForm />
          </div>
          <div className="mt-8 rounded-xl bg-papyrus-100 p-4 text-xs text-ink-500">
            <p className="font-bold text-ink-700">حساب تجريبي للطالب:</p>
            <p>طالب: student@esnad.com / password123</p>
            <p className="mt-1">المستر يدخل بحسابه الثابت (TEACHER_EMAIL).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
