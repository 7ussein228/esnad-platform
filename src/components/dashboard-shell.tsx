import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, LogOut, Menu } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import type { SessionUser } from "@/lib/auth";

export type NavItem = { href: string; label: string; icon?: ReactNode };

const roleLabel: Record<string, string> = {
  STUDENT: "لوحة الطالب",
  TEACHER: "لوحة المستر",
  ADMIN: "لوحة الإدارة",
};

const roleBadgeTone: Record<string, string> = {
  STUDENT: "bg-primary-50 text-primary-700",
  TEACHER: "bg-gold-50 text-gold-700",
  ADMIN: "bg-ink-900/5 text-ink-800",
};

export function DashboardShell({
  user,
  navItems,
  unreadCount = 0,
  children,
}: {
  user: SessionUser;
  navItems: NavItem[];
  unreadCount?: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-papyrus-100/40">
      <input type="checkbox" id="sidebar-toggle" className="peer hidden" />

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <label htmlFor="sidebar-toggle" className="cursor-pointer rounded-lg p-2 hover:bg-papyrus-100 lg:hidden">
            <Menu className="h-5 w-5" />
          </label>
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-600 font-display text-lg font-bold text-white">إ</span>
            <span className="hidden font-display text-lg font-bold text-ink-900 sm:inline">منصة إسناد</span>
          </Link>
          <span className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:inline-block ${roleBadgeTone[user.role]}`}>
            {roleLabel[user.role]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/updates"
            className="relative rounded-lg p-2 text-ink-600 hover:bg-papyrus-100"
            aria-label="الإشعارات"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-terracotta-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/dashboard/profile" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-papyrus-100">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-100 text-sm font-bold text-gold-700">
              {user.name.slice(0, 1)}
            </span>
            <span className="hidden text-sm font-semibold text-ink-800 md:inline">{user.name}</span>
          </Link>
          <form action={logoutAction}>
            <button className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600" title="تسجيل الخروج">
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        <aside className="fixed inset-y-0 top-16 z-20 -translate-x-full border-l border-ink-200 bg-white transition-transform duration-200 peer-checked:translate-x-0 lg:static lg:top-0 lg:block lg:w-64 lg:translate-x-0 lg:border-l lg:bg-transparent w-64">
          <nav className="scrollbar-thin h-[calc(100vh-4rem)] overflow-y-auto p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-primary-50 hover:text-primary-700"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="min-h-[calc(100vh-4rem)] flex-1 p-4 sm:p-6 lg:p-8">
          <div className="animate-fade-in mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
