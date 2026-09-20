import Link from "next/link";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { grades, educationalStages } from "@/db/schema";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, EmptyState, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "استكشف الصفوف الدراسية" };

export default async function ExploreGradesPage() {
  const allGrades = await db
    .select({ id: grades.id, name: grades.name, slug: grades.slug, stageName: educationalStages.name })
    .from(grades)
    .innerJoin(educationalStages, eq(grades.stageId, educationalStages.id))
    .where(eq(grades.isActive, true))
    .orderBy(grades.order);

  const stageGroups = new Map<string, typeof allGrades>();
  for (const g of allGrades) {
    if (!stageGroups.has(g.stageName)) stageGroups.set(g.stageName, []);
    stageGroups.get(g.stageName)!.push(g);
  }

  return (
    <div className="pattern-motif min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading eyebrow="استكشف" title="اختر صفك الدراسي" description="ابدأ رحلتك باختيار المرحلة والصف الدراسي المناسب لك." />
        <div className="mt-10 space-y-10">
          {[...stageGroups.entries()].map(([stage, gs]) => (
            <div key={stage}>
              <h3 className="mb-4 font-display text-lg font-bold text-ink-800">{stage}</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {gs.map((g) => (
                  <Link key={g.id} href={`/explore/${g.slug}`}>
                    <Card className="flex h-full items-center justify-between p-5 transition hover:-translate-y-1 hover:shadow-lg">
                      <span className="font-bold text-ink-800">{g.name}</span>
                      <ChevronLeft className="h-4 w-4 text-ink-400" />
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {allGrades.length === 0 && <EmptyState title="لا توجد صفوف دراسية متاحة حاليًا" />}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
