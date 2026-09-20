import type { ReactNode } from "react";

export type NavConfigItem = { href: string; label: string };

// NOTE: nav only links to routes that exist. Teacher/student management
// screens (courses CRUD, gradebook, reopen queues) are the next UI milestone;
// until then the overview pages + explore carry the links.

export const studentNav: NavConfigItem[] = [
  { href: "/dashboard/student", label: "الرئيسية" },
  { href: "/explore", label: "استكشاف كورسات جديدة" },
  { href: "/dashboard/updates", label: "الإشعارات والإعلانات" },
  { href: "/dashboard/profile", label: "الملف الشخصي" },
];

export const teacherNav: NavConfigItem[] = [
  { href: "/dashboard/teacher", label: "نظرة عامة" },
  { href: "/explore", label: "معاينة الكورسات" },
  { href: "/dashboard/updates", label: "الإعلانات والإشعارات" },
  { href: "/dashboard/profile", label: "الملف الشخصي" },
];

export const adminNav: NavConfigItem[] = [
  { href: "/dashboard/admin", label: "نظرة عامة" },
  { href: "/dashboard/updates", label: "الإعلانات" },
  { href: "/dashboard/profile", label: "الملف الشخصي" },
];

export function navForRole(role: "STUDENT" | "TEACHER" | "ADMIN") {
  if (role === "TEACHER") return teacherNav;
  if (role === "ADMIN") return adminNav;
  return studentNav;
}
