import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function DashboardIndexPage() {
  const user = await requireUser();
  if (user.role === "TEACHER") redirect("/dashboard/teacher");
  if (user.role === "ADMIN") redirect("/dashboard/admin");
  redirect("/dashboard/student");
}
