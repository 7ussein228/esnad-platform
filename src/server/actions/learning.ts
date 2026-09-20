"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  videoProgress,
  studentProgress,
  lessons,
  courseModules,
  reopenRequests,
  contentAccessOverrides,
  courses,
} from "@/db/schema";
import { requireRole, requireUser } from "@/lib/auth";
import { canAccessLesson } from "@/lib/access";
import { notifyUser } from "@/lib/notifications";

export type ActionState = { error?: string; success?: string } | null;

export async function updateVideoProgressAction(
  lessonId: string,
  positionSeconds: number,
  durationSeconds: number
) {
  const student = await requireUser();
  const access = await canAccessLesson(student.id, lessonId);
  if (!access.allowed) return { error: access.reason };

  const percentage = durationSeconds > 0 ? Math.min(100, Math.round((positionSeconds / durationSeconds) * 100)) : 0;
  const completed = percentage >= 90;

  const existing = await db
    .select()
    .from(videoProgress)
    .where(and(eq(videoProgress.userId, student.id), eq(videoProgress.lessonId, lessonId)))
    .limit(1);

  if (existing.length) {
    await db
      .update(videoProgress)
      .set({
        positionSeconds,
        durationSeconds,
        percentage,
        completed: completed || existing[0].completed,
        completedAt: completed && !existing[0].completed ? new Date() : existing[0].completedAt,
        lastWatchedAt: new Date(),
      })
      .where(eq(videoProgress.id, existing[0].id));
  } else {
    await db.insert(videoProgress).values({
      userId: student.id,
      lessonId,
      positionSeconds,
      durationSeconds,
      percentage,
      completed,
      completedAt: completed ? new Date() : undefined,
    });
  }

  if (completed) {
    await markLessonComplete(student.id, lessonId);
  }

  return { success: true };
}

export async function markLessonComplete(studentId: string, lessonId: string) {
  const lessonRows = await db
    .select({ lesson: lessons, module: courseModules })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!lessonRows.length) return;

  const existing = await db
    .select()
    .from(studentProgress)
    .where(and(eq(studentProgress.studentId, studentId), eq(studentProgress.lessonId, lessonId)))
    .limit(1);

  if (existing.length) {
    if (!existing[0].completed) {
      await db
        .update(studentProgress)
        .set({ completed: true, completedAt: new Date() })
        .where(eq(studentProgress.id, existing[0].id));
    }
  } else {
    await db.insert(studentProgress).values({
      studentId,
      courseId: lessonRows[0].module.courseId,
      lessonId,
      completed: true,
      completedAt: new Date(),
    });
  }
}

export async function markLessonCompleteAction(lessonId: string) {
  const student = await requireUser();
  const access = await canAccessLesson(student.id, lessonId);
  if (!access.allowed) return { error: access.reason };
  await markLessonComplete(student.id, lessonId);
  revalidatePath(`/dashboard/student/courses`);
  return { success: "تم تحديد الدرس كمكتمل" };
}

// ---------------- Reopen Requests ----------------
export async function createReopenRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireUser();
  const courseId = String(formData.get("courseId") || "");
  const lessonId = String(formData.get("lessonId") || "") || null;
  const moduleId = String(formData.get("moduleId") || "") || null;
  const contentType = String(formData.get("contentType") || "LESSON");
  const contentId = String(formData.get("contentId") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!courseId || !contentId || !reason) return { error: "بيانات ناقصة" };

  await db.insert(reopenRequests).values({ studentId: student.id, courseId, lessonId, moduleId, contentType, contentId, reason });

  const courseRows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (courseRows.length) {
    await notifyUser(
      courseRows[0].teacherId,
      "REOPEN_REQUEST",
      "طلب إعادة فتح محتوى",
      `${student.name} يطلب إعادة فتح محتوى في كورس ${courseRows[0].title}`,
      `/dashboard/teacher`
    );
  }

  revalidatePath("/dashboard/student/reopen-requests");
  return { success: "تم إرسال الطلب بنجاح، سيتم مراجعته من المستر" };
}

export async function reviewReopenRequestAction(requestId: string, decision: "APPROVED" | "REJECTED") {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(reopenRequests).where(eq(reopenRequests.id, requestId)).limit(1);
  if (!rows.length) return;
  const request = rows[0];

  await db
    .update(reopenRequests)
    .set({ status: decision, reviewedBy: teacher.id, reviewedAt: new Date() })
    .where(eq(reopenRequests.id, requestId));

  if (decision === "APPROVED") {
    await db.insert(contentAccessOverrides).values({
      studentId: request.studentId,
      contentType: request.contentType,
      contentId: request.contentId,
      grantedBy: teacher.id,
    });
  }

  await notifyUser(
    request.studentId,
    "REOPEN_REQUEST",
    decision === "APPROVED" ? "تمت الموافقة على طلبك" : "تم رفض طلبك",
    decision === "APPROVED" ? "تم فتح المحتوى المطلوب، يمكنك المتابعة الآن" : "لم تتم الموافقة على طلب إعادة الفتح",
    `/dashboard/student`
  );

  revalidatePath("/dashboard/teacher/reopen-requests");
}
