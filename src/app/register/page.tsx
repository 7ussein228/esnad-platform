import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "إنشاء حساب جديد" };

export default function RegisterPage() {
  return (
    <div className="pattern-motif flex min-h-screen items-center justify-center bg-papyrus-100 px-4 py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-2xl lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-gold-500 to-terracotta-600 p-10 text-white lg:flex">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white font-display text-xl font-bold text-primary-800">إ</span>
            <span className="font-display text-lg font-bold">منصة إسناد</span>
          </Link>
          <div>
            <p className="font-display text-3xl font-bold leading-snug">انضم إلى آلاف الطلاب</p>
            <p className="mt-4 text-white/90">أنشئ حسابك الآن كطالب لتبدأ التعلم مع المستر.</p>
          </div>
          <p className="text-xs text-white/80">من الإعدادي إلى البكالوريا</p>
        </div>

        <div className="p-8 sm:p-12">
          <h1 className="font-display text-2xl font-bold text-ink-900">إنشاء حساب طالب جديد</h1>
          <p className="mt-1 text-sm text-ink-500">التسجيل متاح للطلبة فقط — حساب المستر ثابت</p>
          <div className="mt-8">
            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
}
