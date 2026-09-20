import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { grades, subjects, courses, users } from "@/db/schema";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, Badge, Button, EmptyState, SectionHeading } from "@/components/ui";
import { CourseCover } from "@/components/course-cover";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GradeSubjectCoursesPage({
  params,
}: {
  params: Promise<{ grade: string; subject: string }>;
}) {
  const { grade: gradeSlug, subject: subjectSlug } = await params;

  const gradeRows = await db.select().from(grades).where(eq(grades.slug, gradeSlug)).limit(1);
  const subjectRows = await db.select().from(subjects).where(eq(subjects.slug, subjectSlug)).limit(1);
  if (!gradeRows.length || !subjectRows.length) notFound();
  const grade = gradeRows[0];
  const subject = subjectRows[0];

  const courseRows = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      price: courses.price,
      currency: courses.currency,
      thumbnailUrl: courses.thumbnailUrl,
      teacherName: users.name,
    })
    .from(courses)
    .innerJoin(users, eq(courses.teacherId, users.id))
    .where(and(eq(courses.gradeId, grade.id), eq(courses.subjectId, subject.id), eq(courses.status, "PUBLISHED")))
    .orderBy(desc(courses.createdAt));

  return (
    <div className="pattern-motif min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading eyebrow={`${grade.name} · ${subject.name}`} title="الكورسات المتاحة" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courseRows.map((c) => (
            <Card key={c.id} className="flex flex-col overflow-hidden">
              <CourseCover thumbnailUrl={c.thumbnailUrl} title={c.title} />
              <div className="flex flex-1 flex-col p-6">
              <Badge tone="primary" className="w-fit">{subject.name}</Badge>
              <p className="mt-3 font-display text-lg font-bold text-ink-900">{c.title}</p>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-ink-500">{c.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
                <span className="text-sm text-ink-500">{c.teacherName}</span>
                <span className="font-display text-lg font-bold text-primary-700">
                  {Number(c.price) === 0 ? "مجانًا" : formatCurrency(c.price, c.currency)}
                </span>
              </div>
              <Button href={`/courses/${c.slug}`} className="mt-4 w-full">عرض التفاصيل</Button>
              </div>
            </Card>
          ))}
          {courseRows.length === 0 && (
            <EmptyState title="لا توجد كورسات منشورة لهذه المادة بعد" description="تابعنا قريبًا لإضافة محتوى جديد." />
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
