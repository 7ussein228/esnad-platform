import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { isStudentProfileComplete } from "@/server/actions/firebase-auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardRootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Google/social students must complete grade+phone before using the dashboard.
  if (user.role === "STUDENT" && !(await isStudentProfileComplete(user.id))) {
    redirect("/complete-profile");
  }
  return <>{children}</>;
}
