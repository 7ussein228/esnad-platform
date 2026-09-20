import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "إنشاء حساب جديد", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const activeGrades = await db
    .select({ id: grades.id, name: grades.name })
    .from(grades)
    .where(eq(grades.isActive, true))
    .orderBy(asc(grades.order));

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
            <p className="mt-4 text-white/90">خطوتين بس: بياناتك، وبعدها كود تحقق على موبايلك.</p>
          </div>
          <p className="text-xs text-white/80">من الإعدادي إلى البكالوريا</p>
        </div>

        <div className="p-8 sm:p-12">
          <div className="mb-6 flex items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-primary-600 px-3 py-1 text-white">1 بياناتك</span>
            <span className="h-px flex-1 bg-ink-200" />
            <span className="rounded-full bg-ink-100 px-3 py-1 text-ink-400">2 كود الموبايل</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900">إنشاء حساب طالب جديد</h1>
          <p className="mt-1 text-sm text-ink-500">التسجيل متاح للطلبة فقط — حساب المستر ثابت</p>
          <div className="mt-8">
            <RegisterForm grades={activeGrades} />
          </div>
        </div>
      </div>
    </div>
  );
}
