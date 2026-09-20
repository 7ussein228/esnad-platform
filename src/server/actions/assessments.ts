"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assessments,
  assessmentQuestions,
  assessmentOptions,
  assessmentAttempts,
  assessmentAnswers,
  courses,
} from "@/db/schema";
import { requireRole, requireUser } from "@/lib/auth";
import { canAccessAssessment } from "@/lib/access";
import { notifyEnrolledStudents } from "@/lib/notifications";

export type ActionState = { error?: string; success?: string } | null;

async function assertOwnsCourse(courseId: string, teacherId: string, role: string) {
  const rows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!rows.length) throw new Error("الكورس غير موجود");
  if (role !== "ADMIN" && rows[0].teacherId !== teacherId) throw new Error("لا تملك صلاحية");
  return rows[0];
}

const assessmentSchema = z.object({
  kind: z.enum(["QUIZ", "EXAM"]),
  title: z.string().min(2, "العنوان مطلوب"),
  description: z.string().optional(),
  examType: z.enum(["PRACTICE", "MONTHLY", "UNIT", "FINAL_REVISION", "MOCK"]).optional(),
  passingPercentage: z.coerce.number().min(1).max(100),
  timeLimitMinutes: z.coerce.number().min(0),
  maxAttempts: z.coerce.number().min(0),
  randomizeQuestions: z.coerce.boolean().optional(),
});

export async function createAssessmentAction(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  await assertOwnsCourse(courseId, teacher.id, teacher.role);

  const parsed = assessmentSchema.safeParse({
    kind: formData.get("kind") || "QUIZ",
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    examType: formData.get("examType") || undefined,
    passingPercentage: formData.get("passingPercentage") || 50,
    timeLimitMinutes: formData.get("timeLimitMinutes") || 0,
    maxAttempts: formData.get("maxAttempts") || 1,
    randomizeQuestions: formData.get("randomizeQuestions") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  const [created] = await db
    .insert(assessments)
    .values({ courseId, ...parsed.data })
    .returning({ id: assessments.id });

  redirect(`/dashboard/teacher/assessments/${created.id}`);
}

export async function updateAssessmentAction(assessmentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  if (!rows.length) return { error: "غير موجود" };
  await assertOwnsCourse(rows[0].courseId, teacher.id, teacher.role);

  const parsed = assessmentSchema.safeParse({
    kind: formData.get("kind") || rows[0].kind,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    examType: formData.get("examType") || undefined,
    passingPercentage: formData.get("passingPercentage") || 50,
    timeLimitMinutes: formData.get("timeLimitMinutes") || 0,
    maxAttempts: formData.get("maxAttempts") || 1,
    randomizeQuestions: formData.get("randomizeQuestions") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  await db.update(assessments).set({ ...parsed.data, updatedAt: new Date() }).where(eq(assessments.id, assessmentId));
  revalidatePath(`/dashboard/teacher/assessments/${assessmentId}`);
  return { success: "تم الحفظ" };
}

export async function setAssessmentStatusAction(assessmentId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  if (!rows.length) return;
  await assertOwnsCourse(rows[0].courseId, teacher.id, teacher.role);
  await db.update(assessments).set({ status, updatedAt: new Date() }).where(eq(assessments.id, assessmentId));

  if (status === "PUBLISHED") {
    await notifyEnrolledStudents(
      rows[0].courseId,
      rows[0].kind === "EXAM" ? "NEW_EXAM" : "NEW_QUIZ",
      rows[0].kind === "EXAM" ? "امتحان جديد متاح" : "اختبار جديد متاح",
      rows[0].title,
      `/dashboard/student/assessments/${assessmentId}`
    );
  }
  revalidatePath(`/dashboard/teacher/assessments/${assessmentId}`);
}

export async function deleteAssessmentAction(assessmentId: string) {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  if (!rows.length) return;
  const course = await assertOwnsCourse(rows[0].courseId, teacher.id, teacher.role);
  await db.delete(assessments).where(eq(assessments.id, assessmentId));
  revalidatePath(`/dashboard/teacher/courses/${course.id}`);
  redirect(`/dashboard/teacher/courses/${course.id}`);
}

// ---------------- Questions & Options ----------------
export async function addQuestionAction(assessmentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  if (!rows.length) return { error: "غير موجود" };
  await assertOwnsCourse(rows[0].courseId, teacher.id, teacher.role);

  const questionText = String(formData.get("questionText") || "").trim();
  const type = String(formData.get("type") || "SINGLE_CHOICE") as "SINGLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_ANSWER";
  const points = Number(formData.get("points") || 1);
  if (!questionText) return { error: "نص السؤال مطلوب" };

  const existing = await db.select().from(assessmentQuestions).where(eq(assessmentQuestions.assessmentId, assessmentId));
  const [question] = await db
    .insert(assessmentQuestions)
    .values({ assessmentId, questionText, type, points, order: existing.length })
    .returning({ id: assessmentQuestions.id });

  if (type === "TRUE_FALSE") {
    const correct = String(formData.get("correctBoolean") || "true") === "true";
    await db.insert(assessmentOptions).values([
      { questionId: question.id, optionText: "صح", isCorrect: correct, order: 0 },
      { questionId: question.id, optionText: "خطأ", isCorrect: !correct, order: 1 },
    ]);
  } else {
    const options = formData.getAll("optionText").map(String);
    const correctIndexes = formData.getAll("correctOption").map(String);
    const values = options
      .filter((text) => text.trim())
      .map((text, idx) => ({
        questionId: question.id,
        optionText: text,
        isCorrect: correctIndexes.includes(String(idx)),
        order: idx,
      }));
    if (values.length >= 2) await db.insert(assessmentOptions).values(values);
  }

  revalidatePath(`/dashboard/teacher/assessments/${assessmentId}`);
  return { success: "تمت إضافة السؤال" };
}

export async function deleteQuestionAction(questionId: string) {
  const teacher = await requireRole("TEACHER", "ADMIN");
  const rows = await db
    .select({ q: assessmentQuestions, a: assessments })
    .from(assessmentQuestions)
    .innerJoin(assessments, eq(assessmentQuestions.assessmentId, assessments.id))
    .where(eq(assessmentQuestions.id, questionId))
    .limit(1);
  if (!rows.length) return;
  await assertOwnsCourse(rows[0].a.courseId, teacher.id, teacher.role);
  await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, questionId));
  revalidatePath(`/dashboard/teacher/assessments/${rows[0].a.id}`);
}

// ---------------- Student attempts ----------------
export async function startAttemptAction(assessmentId: string) {
  const student = await requireUser();
  const access = await canAccessAssessment(student.id, assessmentId);
  if (!access.allowed) throw new Error(access.reason);

  const previous = await db
    .select()
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.assessmentId, assessmentId), eq(assessmentAttempts.studentId, student.id)));

  const [attempt] = await db
    .insert(assessmentAttempts)
    .values({ assessmentId, studentId: student.id, attemptNumber: previous.length + 1 })
    .returning({ id: assessmentAttempts.id });

  redirect(`/dashboard/student/assessments/${assessmentId}?attempt=${attempt.id}`);
}

export async function submitAttemptAction(attemptId: string, formData: FormData) {
  const student = await requireUser();
  const attemptRows = await db.select().from(assessmentAttempts).where(eq(assessmentAttempts.id, attemptId)).limit(1);
  if (!attemptRows.length) throw new Error("المحاولة غير موجودة");
  const attempt = attemptRows[0];
  if (attempt.studentId !== student.id) throw new Error("غير مصرح");
  if (attempt.submittedAt) redirect(`/dashboard/student/assessments/${attempt.assessmentId}?attempt=${attemptId}`);

  const questions = await db
    .select({ question: assessmentQuestions, option: assessmentOptions })
    .from(assessmentQuestions)
    .leftJoin(assessmentOptions, eq(assessmentOptions.questionId, assessmentQuestions.id))
    .where(eq(assessmentQuestions.assessmentId, attempt.assessmentId));

  const grouped = new Map<string, { question: typeof assessmentQuestions.$inferSelect; options: (typeof assessmentOptions.$inferSelect)[] }>();
  for (const row of questions) {
    if (!grouped.has(row.question.id)) grouped.set(row.question.id, { question: row.question, options: [] });
    if (row.option) grouped.get(row.question.id)!.options.push(row.option);
  }

  let score = 0;
  let maxScore = 0;
  const answerRows: { attemptId: string; questionId: string; selectedOptionIds: string[]; isCorrect: boolean }[] = [];

  for (const { question, options } of grouped.values()) {
    maxScore += question.points;
    const selected = formData.getAll(`answer_${question.id}`).map(String);
    const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id).sort();
    const selectedSorted = [...selected].sort();
    const isCorrect =
      correctIds.length === selectedSorted.length && correctIds.every((id, idx) => id === selectedSorted[idx]);
    if (isCorrect) score += question.points;
    answerRows.push({ attemptId, questionId: question.id, selectedOptionIds: selected, isCorrect });
  }

  if (answerRows.length) await db.insert(assessmentAnswers).values(answerRows);

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const assessmentRow = await db.select().from(assessments).where(eq(assessments.id, attempt.assessmentId)).limit(1);
  const passed = percentage >= (assessmentRow[0]?.passingPercentage ?? 50);

  await db
    .update(assessmentAttempts)
    .set({ submittedAt: new Date(), score, maxScore, percentage, passed })
    .where(eq(assessmentAttempts.id, attemptId));

  redirect(`/dashboard/student/assessments/${attempt.assessmentId}?attempt=${attemptId}`);
}
