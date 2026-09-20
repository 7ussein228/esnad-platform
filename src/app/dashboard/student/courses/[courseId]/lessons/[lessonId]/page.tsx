import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Lock } from "lucide-react";
import { db } from "@/db";
import {
  courses, courseModules, lessons, videoAssets, lessonFiles, videoProgress,
  studentProgress, assessments, assignments, assignmentSubmissions,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { canAccessLesson, isEnrolled } from "@/lib/access";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button, Label, Alert } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { VideoPlayer } from "@/components/video-player";
import { AssignmentSubmitForm } from "@/components/assignment-submit-form";
import { markLessonCompleteAction, createReopenRequestAction } from "@/server/actions/learning";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const user = await requireRole("STUDENT");

  const lessonRows = await db
    .select({ lesson: lessons, module: courseModules, course: courses })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(and(eq(lessons.id, lessonId), eq(courses.id, courseId)))
    .limit(1);
  if (!lessonRows.length) notFound();
  const { lesson, module, course } = lessonRows[0];
  if (!(await isEnrolled(user.id, courseId))) notFound();

  const unread = await getUnreadNotificationCount(user.id);
  const access = await canAccessLesson(user.id, lessonId);

  if (!access.allowed) {
    return (
      <DashboardShell user={user} navItems={navForRole("STUDENT")} unreadCount={unread}>
        <Card className="p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-ink-300" />
          <p className="mt-3 font-bold text-ink-800">الدرس مقفل</p>
          <p className="mt-1 text-sm text-ink-500">{access.reason}</p>
          <ActionForm action={createReopenRequestAction} className="mx-auto mt-5 max-w-md space-y-3 text-right">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="lessonId" value={lessonId} />
            <input type="hidden" name="moduleId" value={module.id} />
            <input type="hidden" name="contentType" value="LESSON" />
            <input type="hidden" name="contentId" value={lessonId} />
            <div>
              <Label>اطلب إعادة فتح من المستر (اكتب السبب)</Label>
              <textarea name="reason" required rows={3} placeholder="مثال: النت قطع عندي في الامتحان..." className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm" />
            </div>
            <Button type="submit" className="w-full">إرسال طلب إعادة الفتح</Button>
          </ActionForm>
          <Link href={`/dashboard/student/courses/${courseId}`} className="mt-4 inline-block text-sm font-bold text-primary-700 hover:underline">
            رجوع للكورس
          </Link>
        </Card>
      </DashboardShell>
    );
  }

  const [videos, files, progressRows, completedRows, lessonQuizzes, lessonAssignments] = await Promise.all([
    db.select().from(videoAssets).where(eq(videoAssets.lessonId, lessonId)),
    db.select().from(lessonFiles).where(eq(lessonFiles.lessonId, lessonId)),
    db.select().from(videoProgress).where(and(eq(videoProgress.userId, user.id), eq(videoProgress.lessonId, lessonId))).limit(1),
    db.select().from(studentProgress).where(and(eq(studentProgress.studentId, user.id), eq(studentProgress.lessonId, lessonId))).limit(1),
    db.select().from(assessments).where(and(eq(assessments.lessonId, lessonId), eq(assessments.status, "PUBLISHED"))),
    db.select().from(assignments).where(and(eq(assignments.lessonId, lessonId), eq(assignments.status, "PUBLISHED"))),
  ]);

  const completed = completedRows.length > 0 && completedRows[0].completed;
  const video = videos[0];

  const mySubmissions = lessonAssignments.length
    ? await db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.studentId, user.id))
    : [];
  const submissionByAssignment = new Map(mySubmissions.map((s) => [s.assignmentId, s]));

  return (
    <DashboardShell user={user} navItems={navForRole("STUDENT")} unreadCount={unread}>
      <Link href={`/dashboard/student/courses/${courseId}`} className="text-xs font-bold text-primary-700 hover:underline">
        → {course.title} / {module.title}
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink-900">{lesson.title}</h1>
      {lesson.description && <p className="mt-1 text-sm text-ink-500">{lesson.description}</p>}

      {video && (
        <div className="mt-6">
          <VideoPlayer lessonId={lessonId} src={video.url} poster={video.thumbnailUrl} initialPosition={progressRows[0]?.positionSeconds ?? 0} />
          <p className="mt-1 text-xs text-ink-400">
            {progressRows.length > 0 ? `تقدم المشاهدة: ${progressRows[0].percentage}%` : "ابدأ المشاهدة — تقدمك بيتحفظ تلقائيًا"}
            {video.durationSeconds ? ` · مدة الفيديو ${formatDuration(video.durationSeconds)}` : ""}
          </p>
        </div>
      )}

      {lesson.textContent && (
        <Card className="mt-6 p-6">
          <p className="whitespace-pre-wrap leading-relaxed text-ink-700">{lesson.textContent}</p>
        </Card>
      )}

      {files.length > 0 && (
        <Card className="mt-6 p-6">
          <p className="font-bold text-ink-800">ملفات الدرس</p>
          <ul className="mt-3 space-y-2">
            {files.map((f) => (
              <li key={f.id}>
                <a href={f.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary-700 hover:underline">
                  {f.title} ({f.fileType})
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!completed ? (
        <form action={async () => { "use server"; await markLessonCompleteAction(lessonId); }} className="mt-6">
          <Button type="submit" size="lg">تحديد الدرس كمكتمل والانتقال للتالي</Button>
        </form>
      ) : (
        <Alert tone="success">أتممت هذا الدرس — الدرس التالي مفتوح لك الآن.</Alert>
      )}

      {lessonQuizzes.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-ink-800">اختبارات هذا الدرس</h2>
          <div className="mt-3 grid gap-3">
            {lessonQuizzes.map((q) => (
              <Card key={q.id} className="flex items-center justify-between p-4 text-sm">
                <span className="font-bold text-ink-800">{q.title}</span>
                <Button href={`/dashboard/student/assessments/${q.id}`} size="sm">ابدأ</Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {lessonAssignments.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-ink-800">واجبات هذا الدرس</h2>
          <div className="mt-3 space-y-4">
            {lessonAssignments.map((a) => {
              const sub = submissionByAssignment.get(a.id);
              return (
                <Card key={a.id} className="p-5">
                  <p className="font-bold text-ink-800">{a.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">{a.instructions}</p>
                  {sub ? (
                    <Badge tone={sub.status === "SUBMITTED" ? "warning" : sub.status === "PASSED" ? "success" : "error"}>
                      {sub.status === "SUBMITTED" ? "تم التسليم — بانتظار التصحيح" : `الدرجة: ${sub.grade ?? 0}/${a.maxScore}`}
                    </Badge>
                  ) : (
                    <AssignmentSubmitForm assignmentId={a.id} />
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
