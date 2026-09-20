import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  courseModules,
  lessons,
  enrollments,
  studentProgress,
  contentAccessOverrides,
  assessments,
  assessmentAttempts,
} from "@/db/schema";

export type AccessResult = { allowed: boolean; reason?: string };

async function hasActiveOverride(studentId: string, contentId: string) {
  const rows = await db
    .select({ id: contentAccessOverrides.id })
    .from(contentAccessOverrides)
    .where(
      and(
        eq(contentAccessOverrides.studentId, studentId),
        eq(contentAccessOverrides.contentId, contentId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export async function isEnrolled(studentId: string, courseId: string) {
  const rows = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.courseId, courseId),
        eq(enrollments.status, "ACTIVE")
      )
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Server-side authority for whether a student may access a given lesson.
 * Enforced from every route/server action that serves lesson content,
 * regardless of what the client UI shows.
 */
export async function canAccessLesson(studentId: string, lessonId: string): Promise<AccessResult> {
  const lessonRows = await db
    .select({
      lesson: lessons,
      module: courseModules,
      course: courses,
    })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lessonRows.length) return { allowed: false, reason: "الدرس غير موجود" };
  const { lesson, module: mod, course } = lessonRows[0];

  if (lesson.status !== "PUBLISHED" || course.status !== "PUBLISHED") {
    return { allowed: false, reason: "هذا المحتوى غير منشور بعد" };
  }

  if (lesson.isFreePreview) return { allowed: true };

  const enrolled = await isEnrolled(studentId, course.id);
  if (!enrolled) return { allowed: false, reason: "يجب الاشتراك في الكورس أولاً" };

  if (await hasActiveOverride(studentId, lessonId)) return { allowed: true };

  if (!lesson.requiresPreviousCompletion) return { allowed: true };

  // find previous published lesson within same module ordering (by order across module then lesson order)
  const moduleLessons = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.moduleId, mod.id), eq(lessons.status, "PUBLISHED")))
    .orderBy(asc(lessons.order));

  const idx = moduleLessons.findIndex((l) => l.id === lessonId);
  if (idx <= 0) return { allowed: true }; // first lesson of module always unlocked once enrolled

  const previousLesson = moduleLessons[idx - 1];
  const prevProgress = await db
    .select()
    .from(studentProgress)
    .where(and(eq(studentProgress.studentId, studentId), eq(studentProgress.lessonId, previousLesson.id)))
    .limit(1);

  if (prevProgress.length && prevProgress[0].completed) return { allowed: true };

  if (await hasActiveOverride(studentId, previousLesson.id)) return { allowed: true };

  return { allowed: false, reason: "أكمل الدرس السابق أولاً لفتح هذا الدرس" };
}

export async function canAccessAssessment(studentId: string, assessmentId: string): Promise<AccessResult> {
  const rows = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  if (!rows.length) return { allowed: false, reason: "الاختبار غير موجود" };
  const assessment = rows[0];
  if (assessment.status !== "PUBLISHED") return { allowed: false, reason: "هذا الاختبار غير منشور بعد" };

  const enrolled = await isEnrolled(studentId, assessment.courseId);
  if (!enrolled) return { allowed: false, reason: "يجب الاشتراك في الكورس أولاً" };

  if (assessment.lessonId) {
    const lessonAccess = await canAccessLesson(studentId, assessment.lessonId);
    if (!lessonAccess.allowed) return lessonAccess;
  }

  const attempts = await db
    .select()
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.assessmentId, assessmentId), eq(assessmentAttempts.studentId, studentId)));

  if (assessment.maxAttempts > 0 && attempts.length >= assessment.maxAttempts) {
    const overridden = await hasActiveOverride(studentId, assessmentId);
    if (!overridden) return { allowed: false, reason: "لقد استنفذت عدد المحاولات المسموح بها" };
  }

  return { allowed: true };
}

export async function courseProgressPercentage(studentId: string, courseId: string) {
  const allLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(and(eq(courseModules.courseId, courseId), eq(lessons.status, "PUBLISHED")));

  if (!allLessons.length) return 0;

  const completed = await db
    .select({ id: studentProgress.id })
    .from(studentProgress)
    .where(and(eq(studentProgress.studentId, studentId), eq(studentProgress.courseId, courseId), eq(studentProgress.completed, true)));

  return Math.round((completed.length / allLessons.length) * 100);
}
