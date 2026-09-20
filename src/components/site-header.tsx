import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui";

const links = [
  { href: "/explore", label: "الصفوف الدراسية" },
  { href: "/#subjects", label: "المواد" },
  { href: "/#how-it-works", label: "كيف تعمل المنصة" },
  { href: "/#faq", label: "الأسئلة الشائعة" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-papyrus-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 font-display text-xl font-bold text-white shadow-md shadow-primary-900/20">
            إ
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-bold text-ink-900">منصة إسناد</span>
            <span className="text-[11px] font-semibold tracking-wide text-gold-600">دراسات · تاريخ · جغرافيا</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3.5 py-2 text-sm font-semibold text-ink-700 transition hover:bg-white hover:text-primary-700"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button href="/dashboard" size="sm">
              لوحة التحكم
            </Button>
          ) : (
            <>
              <Button href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                تسجيل الدخول
              </Button>
              <Button href="/register" size="sm">
                إنشاء حساب
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
