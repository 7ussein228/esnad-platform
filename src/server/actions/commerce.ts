"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { createOrderForCourse, grantEnrollment } from "@/lib/payments-core";

export async function enrollInCourseAction(courseId: string) {
  const student = await requireRole("STUDENT");
  const rows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!rows.length) throw new Error("الكورس غير موجود");
  const course = rows[0];

  if (Number(course.price) <= 0) {
    await grantEnrollment(student.id, courseId, "FREE");
    redirect(`/dashboard/student`);
  }

  const { order } = await createOrderForCourse(student.id, courseId);
  redirect(`/checkout/${order.id}`);
}
