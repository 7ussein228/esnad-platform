import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Landmark, Map as MapIcon, ScrollText, BookOpen } from "lucide-react";
import { db } from "@/db";
import { grades, subjects, gradeSubjects } from "@/db/schema";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, EmptyState, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

const subjectIcon: Record<string, React.ElementType> = { landmark: Landmark, scroll: ScrollText, map: MapIcon };

export default async function GradeSubjectsPage({ params }: { params: Promise<{ grade: string }> }) {
  const { grade: gradeSlug } = await params;
  const gradeRows = await db.select().from(grades).where(eq(grades.slug, gradeSlug)).limit(1);
  if (!gradeRows.length) notFound();
  const grade = gradeRows[0];

  const subjectRows = await db
    .select({ id: subjects.id, name: subjects.name, slug: subjects.slug, description: subjects.description, icon: subjects.icon })
    .from(gradeSubjects)
    .innerJoin(subjects, eq(gradeSubjects.subjectId, subjects.id))
    .where(and(eq(gradeSubjects.gradeId, grade.id), eq(gradeSubjects.isActive, true), eq(subjects.isActive, true)));

  return (
    <div className="pattern-motif min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading eyebrow={grade.name} title="اختر المادة الدراسية" />
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {subjectRows.map((s) => {
            const Icon = subjectIcon[s.icon || "book"] || BookOpen;
            return (
              <Link key={s.id} href={`/explore/${grade.slug}/${s.slug}`}>
                <Card className="h-full p-6 transition hover:-translate-y-1 hover:shadow-lg">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="mt-4 font-display text-lg font-bold text-ink-900">{s.name}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-500">{s.description}</p>
                </Card>
              </Link>
            );
          })}
          {subjectRows.length === 0 && <EmptyState title="لا توجد مواد متاحة لهذا الصف بعد" />}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
