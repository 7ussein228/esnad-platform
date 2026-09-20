import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { Timer, History, CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/db";
import {
  assessments, assessmentQuestions, assessmentOptions, assessmentAttempts, assessmentAnswers,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { canAccessAssessment } from "@/lib/access";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { navForRole } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button, Alert } from "@/components/ui";
import { TimerWithAutoSubmit } from "@/components/client-widgets";
import { startAttemptAction, submitAttemptAction } from "@/server/actions/assessments";

export const dynamic = "force-dynamic";

export default async function StudentAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ assessmentId: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { assessmentId } = await params;
  const { attempt: attemptId } = await searchParams;
  const user = await requireRole("STUDENT");

  const aRows = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  if (!aRows.length) notFound();
  const assessment = aRows[0];
  if (assessment.status !== "PUBLISHED") notFound();

  const access = await canAccessAssessment(user.id, assessmentId);
  const unread = await getUnreadNotificationCount(user.id);

  const myAttempts = await db
    .select()
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.assessmentId, assessmentId), eq(assessmentAttempts.studentId, user.id)))
    .orderBy(desc(assessmentAttempts.startedAt));

  // Active attempt view
  let activeAttempt: typeof assessmentAttempts.$inferSelect | null = null;
  if (attemptId) {
    const rows = await db.select().from(assessmentAttempts).where(eq(assessmentAttempts.id, attemptId)).limit(1);
    if (!rows.length || rows[0].studentId !== user.id || rows[0].assessmentId !== assessmentId) notFound();
    activeAttempt = rows[0];
  }

  const shell = (content: React.ReactNode) => (
    <DashboardShell user={user} navItems={navForRole("STUDENT")} unreadCount={unread}>
      <Badge tone={assessment.kind === "EXAM" ? "gold" : "primary"}>{assessment.kind === "EXAM" ? "امتحان" : "اختبار"}</Badge>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink-900">{assessment.title}</h1>
      {assessment.description && <p className="mt-1 text-sm text-ink-500">{assessment.description}</p>}
      {content}
    </DashboardShell>
  );

  // ---- Review of a submitted attempt (correct answers shown ONLY after submit) ----
  if (activeAttempt?.submittedAt) {
    const qRows = await db
      .select({ question: assessmentQuestions, option: assessmentOptions })
      .from(assessmentQuestions)
      .leftJoin(assessmentOptions, eq(assessmentOptions.questionId, assessmentQuestions.id))
      .where(eq(assessmentQuestions.assessmentId, assessmentId))
      .orderBy(asc(assessmentQuestions.order), asc(assessmentOptions.order));
    const ansRows = await db.select().from(assessmentAnswers).where(eq(assessmentAnswers.attemptId, activeAttempt.id));
    const ansByQ = new Map(ansRows.map((a) => [a.questionId, a]));

    const grouped = new Map<string, { q: typeof assessmentQuestions.$inferSelect; opts: (typeof assessmentOptions.$inferSelect)[] }>();
    for (const r of qRows) {
      if (!grouped.has(r.question.id)) grouped.set(r.question.id, { q: r.question, opts: [] });
      if (r.option) grouped.get(r.question.id)!.opts.push(r.option);
    }

    return shell(
      <div className="mt-6 space-y-4">
        <Alert tone={activeAttempt.passed ? "success" : "error"}>
          نتيجتك: {activeAttempt.score}/{activeAttempt.maxScore} ({activeAttempt.percentage}%) — {activeAttempt.passed ? "ناجح 🎉" : "راسب، حاول تاني"}
        </Alert>
        {[...grouped.values()].map(({ q, opts }, qi) => {
          const ans = ansByQ.get(q.id);
          const selected = new Set((ans?.selectedOptionIds as string[]) ?? []);
          return (
            <Card key={q.id} className="p-5">
              <p className="font-bold text-ink-800">{qi + 1}. {q.questionText} {ans?.isCorrect ? <CheckCircle2 className="inline h-4 w-4 text-green-600" /> : <XCircle className="inline h-4 w-4 text-red-500" />}</p>
              <ul className="mt-3 space-y-2">
                {opts.map((o) => (
                  <li
                    key={o.id}
                    className={`rounded-xl border px-3 py-2 text-sm ${o.isCorrect ? "border-green-300 bg-green-50 font-bold text-green-800" : selected.has(o.id) ? "border-red-300 bg-red-50 text-red-700" : "border-ink-100 text-ink-600"}`}
                  >
                    {o.optionText} {o.isCorrect ? "✔" : selected.has(o.id) ? "✘ إجابتك" : ""}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
        <Button href={`/dashboard/student/assessments/${assessmentId}`} variant="outline">رجوع</Button>
      </div>
    );
  }

  // ---- Ongoing attempt: question form WITHOUT correct answers ----
  if (activeAttempt) {
    const qRows = await db
      .select({ question: assessmentQuestions, option: assessmentOptions })
      .from(assessmentQuestions)
      .leftJoin(assessmentOptions, eq(assessmentOptions.questionId, assessmentQuestions.id))
      .where(eq(assessmentQuestions.assessmentId, assessmentId))
      .orderBy(asc(assessmentQuestions.order), asc(assessmentOptions.order));

    const grouped = new Map<string, { q: typeof assessmentQuestions.$inferSelect; opts: { id: string; text: string }[] }>();
    for (const r of qRows) {
      if (!grouped.has(r.question.id)) grouped.set(r.question.id, { q: r.question, opts: [] });
      // SECURITY: isCorrect is NEVER sent to the client before submission.
      if (r.option) grouped.get(r.question.id)!.opts.push({ id: r.option.id, text: r.option.optionText });
    }
    let questions = [...grouped.values()];
    // Deterministic per-attempt shuffle: stable across re-renders, different per attempt.
    // (Math.random is banned during render and would reshuffle on every render.)
    if (assessment.randomizeQuestions) {
      const seed = activeAttempt.id;
      const rank = (id: string) => {
        let h = 0;
        const s = `${seed}:${id}`;
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
        return h;
      };
      questions = questions.sort((a, b) => rank(a.q.id) - rank(b.q.id));
    }

    const formId = `attempt-${activeAttempt.id}`;
    return shell(
      <div className="mt-6">
        {assessment.timeLimitMinutes > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <Timer className="h-5 w-5 text-terracotta-500" />
            <TimerWithAutoSubmit minutes={assessment.timeLimitMinutes} formId={formId} />
          </div>
        )}
        <form id={formId} action={submitAttemptAction.bind(null, activeAttempt.id)} className="space-y-4">
          {questions.map(({ q, opts }, qi) => (
            <Card key={q.id} className="p-5">
              <p className="font-bold text-ink-800">{qi + 1}. {q.questionText} <span className="text-xs font-normal text-ink-400">({q.points} درجات)</span></p>
              <div className="mt-3 space-y-2">
                {opts.map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink-100 px-3 py-2 text-sm transition hover:border-primary-300">
                    <input
                      type={q.type === "MULTIPLE_ANSWER" ? "checkbox" : "radio"}
                      name={`answer_${q.id}`}
                      value={o.id}
                      required={q.type !== "MULTIPLE_ANSWER"}
                    />
                    {o.text}
                  </label>
                ))}
              </div>
            </Card>
          ))}
          <Button type="submit" size="lg" className="w-full">تسليم الإجابات</Button>
        </form>
      </div>
    );
  }

  // ---- Landing: access gate + start + history ----
  if (!access.allowed) {
    return shell(
      <Card className="mt-6 p-8 text-center">
        <p className="font-bold text-ink-800">غير متاح حاليًا</p>
        <p className="mt-1 text-sm text-ink-500">{access.reason}</p>
      </Card>
    );
  }

  const remaining = assessment.maxAttempts > 0 ? assessment.maxAttempts - myAttempts.length : null;

  return shell(
    <div className="mt-6 space-y-4">
      <Card className="p-5 text-sm text-ink-600">
        <p>درجة النجاح: <b>{assessment.passingPercentage}%</b></p>
        {assessment.timeLimitMinutes > 0 && <p>الوقت: <b>{assessment.timeLimitMinutes} دقيقة</b></p>}
        <p>المحاولات المتاحة: <b>{remaining === null ? "غير محدودة" : remaining}</b></p>
      </Card>

      {(remaining === null || remaining > 0) ? (
        <form action={startAttemptAction.bind(null, assessmentId)}>
          <Button type="submit" size="lg" className="w-full">ابدأ المحاولة {myAttempts.length + 1}</Button>
        </form>
      ) : (
        <Alert tone="warning">استنفذت عدد المحاولات — اطلب إعادة فتح من المستر.</Alert>
      )}

      {myAttempts.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 font-bold text-ink-800"><History className="h-5 w-5 text-ink-400" /> محاولاتك السابقة</h2>
          <div className="mt-3 space-y-2">
            {myAttempts.map((a) => (
              <Card key={a.id} className="flex items-center justify-between p-4 text-sm">
                <span className="text-ink-600">محاولة {a.attemptNumber}</span>
                {a.submittedAt ? (
                  <span className="flex items-center gap-2">
                    <Badge tone={a.passed ? "success" : "error"}>{a.percentage}%</Badge>
                    <Button href={`/dashboard/student/assessments/${assessmentId}?attempt=${a.id}`} size="sm" variant="outline">مراجعة</Button>
                  </span>
                ) : (
                  <Button href={`/dashboard/student/assessments/${assessmentId}?attempt=${a.id}`} size="sm">أكمل المحاولة</Button>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
