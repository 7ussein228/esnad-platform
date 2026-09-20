import "server-only";
import { db } from "@/db";
import { notifications, auditLogs, enrollments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type NotificationType =
  | "NEW_LESSON"
  | "NEW_VIDEO"
  | "NEW_QUIZ"
  | "NEW_EXAM"
  | "NEW_ASSIGNMENT"
  | "GRADE"
  | "ANNOUNCEMENT"
  | "ENROLLMENT"
  | "PAYMENT"
  | "REOPEN_REQUEST";

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  link?: string
) {
  await db.insert(notifications).values({ userId, type, title, body, link });
}

export async function notifyEnrolledStudents(
  courseId: string,
  type: NotificationType,
  title: string,
  body?: string,
  link?: string
) {
  const rows = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId));

  if (!rows.length) return;
  await db.insert(notifications).values(
    rows.map((r) => ({ userId: r.studentId, type, title, body, link }))
  );
}

export async function getUnreadNotificationCount(userId: string) {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return rows.length;
}

export async function logAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  await db.insert(auditLogs).values({
    actorId: actorId ?? undefined,
    action,
    entityType,
    entityId,
    metadata,
  });
}
