import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isStudentProfileComplete } from "@/server/actions/firebase-auth";
import { CompleteProfileForm } from "./complete-form";

export const metadata: Metadata = { title: "استكمال البيانات", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

// Shown once after Google/social login when grade/phone are missing.
export default async function CompleteProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard");
  if (await isStudentProfileComplete(user.id)) redirect("/dashboard");

  const activeGrades = await db
    .select({ id: grades.id, name: grades.name })
    .from(grades)
    .where(eq(grades.isActive, true))
    .orderBy(asc(grades.order));

  return (
    <div className="pattern-motif flex min-h-screen items-center justify-center bg-papyrus-100 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-ink-200 bg-white p-8 shadow-2xl sm:p-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 font-display text-xl font-bold text-white">إ</span>
          <span className="font-display text-lg font-bold text-ink-900">منصة إسناد</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-ink-900">أهلًا {user.name} 👋</h1>
        <p className="mt-1 text-sm text-ink-500">
          دخلت بنجاح بجوجل — فاضل خطوة واحدة: قلنا سنتك الدراسية ورقم موبايلك عشان نخصصلك المحتوى.
        </p>
        <div className="mt-6">
          <CompleteProfileForm grades={activeGrades} />
        </div>
      </div>
    </div>
  );
}
