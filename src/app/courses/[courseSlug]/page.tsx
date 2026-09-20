import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { PlayCircle, FileText, Lock, Unlock, BookOpen } from "lucide-react";
import { db } from "@/db";
import { courses, courseModules, lessons, grades, subjects, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isEnrolled } from "@/lib/access";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, Badge, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { enrollInCourseAction } from "@/server/actions/commerce";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ courseSlug: string }> }): Promise<Metadata> {
  const { courseSlug } = await params;
  const rows = await db
    .select({ title: courses.title, description: courses.description })
    .from(courses)
    .where(and(eq(courses.slug, courseSlug), eq(courses.status, "PUBLISHED")))
    .limit(1);
  if (!rows.length) return { title: "كورس غير موجود" };
  const description = rows[0].description?.slice(0, 160) ?? `كورس ${rows[0].title} على منصة إسناد`;
  return {
    title: rows[0].title,
    description,
    alternates: { canonical: `/courses/${courseSlug}` },
    openGraph: { title: rows[0].title, description, type: "website", locale: "ar_EG" },
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const rows = await db
    .select({
      course: courses,
      gradeName: grades.name,
      subjectName: subjects.name,
      teacherName: users.name,
      teacherBio: users.bio,
    })
    .from(courses)
    .innerJoin(grades, eq(courses.gradeId, grades.id))
    .innerJoin(subjects, eq(courses.subjectId, subjects.id))
    .innerJoin(users, eq(courses.teacherId, users.id))
    .where(and(eq(courses.slug, courseSlug), eq(courses.status, "PUBLISHED")))
    .limit(1);

  if (!rows.length) notFound();
  const { course, gradeName, subjectName, teacherName, teacherBio } = rows[0];

  const modules = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, course.id))
    .orderBy(asc(courseModules.order));

  // Only this course's published lessons (scoped join — never the whole table).
  const allLessons = await db
    .select({ lesson: lessons })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(and(eq(courseModules.courseId, course.id), eq(lessons.status, "PUBLISHED")))
    .orderBy(asc(lessons.order));

  const lessonsByModule = new Map<string, (typeof lessons.$inferSelect)[]>();
  for (const { lesson: l } of allLessons) {
    if (!lessonsByModule.has(l.moduleId)) lessonsByModule.set(l.moduleId, []);
    lessonsByModule.get(l.moduleId)!.push(l);
  }

  const user = await getCurrentUser();
  const enrolled = user && user.role === "STUDENT" ? await isEnrolled(user.id, course.id) : false;
  const totalLessons = modules.reduce((acc, m) => acc + (lessonsByModule.get(m.id)?.length || 0), 0);

  return (
    <div className="pattern-motif min-h-screen">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Course",
                name: course.title,
                description: course.description ?? undefined,
                provider: {
                  "@type": "EducationalOrganization",
                  name: "منصة إسناد",
                  sameAs: process.env.NEXT_PUBLIC_APP_URL ?? undefined,
                },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "الرئيسية", item: "/" },
                  { "@type": "ListItem", position: 2, name: "استكشف الكورسات", item: "/explore" },
                  { "@type": "ListItem", position: 3, name: course.title },
                ],
              },
            ],
          }),
        }}
      />

      <section className="border-b border-ink-200/60 bg-gradient-to-b from-primary-900 to-primary-700 px-4 py-14 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-2">
            <Badge tone="gold">{subjectName}</Badge>
            <Badge tone="neutral" className="border-white/30 bg-white/10 text-white">{gradeName}</Badge>
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{course.title}</h1>
          <p className="mt-3 max-w-2xl text-primary-100">{course.description}</p>
          <p className="mt-4 text-sm text-primary-200">المستر: {teacherName}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-display text-xl font-bold text-ink-900">محتوى الكورس</h2>
          <p className="mt-1 text-sm text-ink-500">{modules.length} وحدة · {totalLessons} درس</p>

          <div className="mt-6 space-y-4">
            {modules.map((m, idx) => (
              <Card key={m.id} className="overflow-hidden">
                <div className="border-b border-ink-100 bg-papyrus-100/60 px-5 py-3">
                  <p className="font-bold text-ink-800">الوحدة {idx + 1}: {m.title}</p>
                </div>
                <ul className="divide-y divide-ink-100">
                  {(lessonsByModule.get(m.id) || []).map((l) => (
                    <li key={l.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className="flex items-center gap-2 text-ink-700">
                        {l.type === "VIDEO" ? <PlayCircle className="h-4 w-4 text-primary-500" /> : <FileText className="h-4 w-4 text-primary-500" />}
                        {l.title}
                      </span>
                      {l.isFreePreview || enrolled ? (
                        <Unlock className="h-4 w-4 text-[--color-success]" />
                      ) : (
                        <Lock className="h-4 w-4 text-ink-400" />
                      )}
                    </li>
                  ))}
                  {(lessonsByModule.get(m.id) || []).length === 0 && (
                    <li className="px-5 py-3 text-sm text-ink-400">لا توجد دروس منشورة بعد في هذه الوحدة</li>
                  )}
                </ul>
              </Card>
            ))}
            {modules.length === 0 && (
              <Card className="p-8 text-center text-ink-500">
                <BookOpen className="mx-auto h-8 w-8 text-ink-300" />
                <p className="mt-2">سيتم إضافة محتوى هذا الكورس قريبًا</p>
              </Card>
            )}
          </div>

          {teacherBio && (
            <Card className="mt-8 p-6">
              <p className="text-sm font-bold text-ink-800">عن المستر</p>
              <p className="mt-2 text-sm text-ink-500">{teacherBio}</p>
            </Card>
          )}
        </div>

        <div>
          <Card className="sticky top-24 p-6">
            <p className="font-display text-3xl font-bold text-primary-700">
              {Number(course.price) === 0 ? "مجانًا" : formatCurrency(course.price, course.currency)}
            </p>
            <p className="mt-1 text-sm text-ink-500">وصول كامل لجميع دروس الكورس بعد الاشتراك</p>

            <div className="mt-6">
              {!user && (
                <Button href="/login" className="w-full" size="lg">سجل الدخول للاشتراك</Button>
              )}
              {user && user.role !== "STUDENT" && (
                <p className="rounded-xl bg-papyrus-100 p-3 text-center text-sm text-ink-500">الاشتراك متاح لحسابات الطلاب فقط</p>
              )}
              {user && user.role === "STUDENT" && enrolled && (
                <Button href={`/dashboard/student/courses/${course.id}`} className="w-full" size="lg">
                  متابعة التعلم
                </Button>
              )}
              {user && user.role === "STUDENT" && !enrolled && (
                <form action={enrollInCourseAction.bind(null, course.id)}>
                  <Button type="submit" className="w-full" size="lg">
                    {Number(course.price) === 0 ? "اشترك مجانًا" : "اشترك الآن"}
                  </Button>
                </form>
              )}
            </div>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
