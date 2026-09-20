"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignments, assignmentSubmissions, courses, enrollments } from "@/db/schema";
import { requireRole, requireUser } from "@/lib/auth";
import { isEnrolled } from "@/lib/access";
import { notifyEnrolledStudents, notifyUser } from "@/lib/notifications";

export type ActionState = { error?: string; success?: string } | null;

async function assertOwnsCourse(courseId: string, teacherId: string, role: string) {
  const rows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!rows.length) throw new Error("الكورس غير موجود");
  if (role !== "ADMIN" && rows[0].teacherId !== teacherId) throw new Error("لا تملك صلاحية");
  return rows[0];
}

const assignmentSchema = z.object({
  title: z.string().min(2, "العنوان مطلوب"),
  instructions: z.string().min(5, "التعليمات مطلوبة"),
  deadline: z.string().optional(),
  passingScore: z.coerce.number().min(0).max(100),
  maxScore: z.coerce.number().min(1),
});

export async function createAssignmentAction(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  await assertOwnsCourse(courseId, teacher.id, teacher.role);
  const parsed = assignmentSchema.safeParse({
    title: formData.get("title"),
    instructions: formData.get("instructions"),
    deadline: formData.get("deadline") || undefined,
    passingScore: formData.get("passingScore") || 50,
    maxScore: formData.get("maxScore") || 100,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  const [created] = await db
    .insert(assignments)
    .values({
      courseId,
      title: parsed.data.title,
      instructions: parsed.data.instructions,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      passingScore: parsed.data.passingScore,
      maxScore: parsed.data.maxScore,
    })
    .returning({ id: assignments.id });

  redirect(`/dashboard/teacher/assignments/${created.id}`);
}

export async function updateAssignmentAction(assignmentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
  if (!rows.length) return { error: "غير موجود" };
  await assertOwnsCourse(rows[0].courseId, teacher.id, teacher.role);

  const parsed = assignmentSchema.safeParse({
    title: formData.get("title"),
    instructions: formData.get("instructions"),
    deadline: formData.get("deadline") || undefined,
    passingScore: formData.get("passingScore") || 50,
    maxScore: formData.get("maxScore") || 100,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  await db
    .update(assignments)
    .set({
      title: parsed.data.title,
      instructions: parsed.data.instructions,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      passingScore: parsed.data.passingScore,
      maxScore: parsed.data.maxScore,
    })
    .where(eq(assignments.id, assignmentId));

  revalidatePath(`/dashboard/teacher/assignments/${assignmentId}`);
  return { success: "تم الحفظ" };
}

export async function setAssignmentStatusAction(assignmentId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
  if (!rows.length) return;
  await assertOwnsCourse(rows[0].courseId, teacher.id, teacher.role);
  await db.update(assignments).set({ status }).where(eq(assignments.id, assignmentId));
  if (status === "PUBLISHED") {
    await notifyEnrolledStudents(
      rows[0].courseId,
      "NEW_ASSIGNMENT",
      "واجب جديد",
      rows[0].title,
      `/dashboard/student/assignments/${assignmentId}`
    );
  }
  revalidatePath(`/dashboard/teacher/assignments/${assignmentId}`);
}

export async function deleteAssignmentAction(assignmentId: string) {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
  if (!rows.length) return;
  const course = await assertOwnsCourse(rows[0].courseId, teacher.id, teacher.role);
  await db.delete(assignments).where(eq(assignments.id, assignmentId));
  redirect(`/dashboard/teacher/courses/${course.id}`);
}

export async function submitAssignmentAction(assignmentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireUser();
  const rows = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
  if (!rows.length) return { error: "الواجب غير موجود" };
  const assignment = rows[0];

  const enrolled = await isEnrolled(student.id, assignment.courseId);
  if (!enrolled) return { error: "يجب الاشتراك في الكورس أولاً" };

  const textSubmission = String(formData.get("textSubmission") || "").trim();
  const fileUrl = String(formData.get("fileUrl") || "").trim();
  const fileName = String(formData.get("fileName") || "").trim();
  if (!textSubmission && !fileUrl) return { error: "أضف نص الإجابة أو ارفع ملفًا" };

  await db
    .insert(assignmentSubmissions)
    .values({
      assignmentId,
      studentId: student.id,
      textSubmission: textSubmission || undefined,
      fileUrl: fileUrl || undefined,
      fileName: fileName || undefined,
      submittedAt: new Date(),
      status: "SUBMITTED",
    })
    .onConflictDoUpdate({
      target: [assignmentSubmissions.assignmentId, assignmentSubmissions.studentId],
      set: {
        textSubmission: textSubmission || undefined,
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
        submittedAt: new Date(),
        status: "SUBMITTED",
        grade: null,
        feedback: null,
        gradedAt: null,
      },
    });

  revalidatePath(`/dashboard/student/assignments/${assignmentId}`);
  return { success: "تم إرسال الواجب بنجاح" };
}

export async function gradeSubmissionAction(submissionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db
    .select({ submission: assignmentSubmissions, assignment: assignments })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
    .where(eq(assignmentSubmissions.id, submissionId))
    .limit(1);
  if (!rows.length) return { error: "غير موجود" };
  await assertOwnsCourse(rows[0].assignment.courseId, teacher.id, teacher.role);

  const grade = Number(formData.get("grade") || 0);
  const feedback = String(formData.get("feedback") || "");
  const passed = grade >= rows[0].assignment.passingScore;

  await db
    .update(assignmentSubmissions)
    .set({ grade, feedback, status: passed ? "PASSED" : "FAILED", gradedAt: new Date(), gradedBy: teacher.id })
    .where(eq(assignmentSubmissions.id, submissionId));

  await notifyUser(
    rows[0].submission.studentId,
    "GRADE",
    "تم تصحيح الواجب",
    `${rows[0].assignment.title}: ${grade}/${rows[0].assignment.maxScore}`,
    `/dashboard/student/assignments/${rows[0].assignment.id}`
  );

  revalidatePath(`/dashboard/teacher/assignments/${rows[0].assignment.id}`);
  return { success: "تم حفظ الدرجة" };
}
