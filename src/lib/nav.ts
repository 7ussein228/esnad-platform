import type { ReactNode } from "react";

export type NavConfigItem = { href: string; label: string };

export const studentNav: NavConfigItem[] = [
  { href: "/dashboard/student", label: "الرئيسية" },
  { href: "/dashboard/student/courses", label: "كورساتي" },
  { href: "/dashboard/student/reopen-requests", label: "طلبات إعادة الفتح" },
  { href: "/dashboard/updates", label: "الإشعارات والإعلانات" },
  { href: "/dashboard/profile", label: "الملف الشخصي" },
  { href: "/explore", label: "استكشاف كورسات جديدة" },
];

export const teacherNav: NavConfigItem[] = [
  { href: "/dashboard/teacher", label: "نظرة عامة" },
  { href: "/dashboard/teacher/courses", label: "كورساتي" },
  { href: "/dashboard/teacher/students", label: "الطلاب والتقدم" },
  { href: "/dashboard/teacher/reopen-requests", label: "طلبات إعادة الفتح" },
  { href: "/dashboard/teacher/resources", label: "الموارد التاريخية والجغرافية" },
  { href: "/dashboard/updates", label: "الإعلانات والإشعارات" },
  { href: "/dashboard/profile", label: "الملف الشخصي" },
];

export const adminNav: NavConfigItem[] = [
  { href: "/dashboard/admin", label: "نظرة عامة" },
  { href: "/dashboard/admin/academic", label: "الهيكل الأكاديمي" },
  { href: "/dashboard/admin/users", label: "المستخدمون" },
  { href: "/dashboard/admin/courses", label: "الكورسات" },
  { href: "/dashboard/admin/commerce", label: "الاشتراكات والمدفوعات" },
  { href: "/dashboard/updates", label: "الإعلانات" },
  { href: "/dashboard/profile", label: "الملف الشخصي" },
];

export function navForRole(role: "STUDENT" | "TEACHER" | "ADMIN") {
  if (role === "TEACHER") return teacherNav;
  if (role === "ADMIN") return adminNav;
  return studentNav;
}
