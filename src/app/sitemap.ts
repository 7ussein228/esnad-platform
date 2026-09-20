import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { grades, subjects, courses, gradeSubjects } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/explore`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const [allGrades, publishedCourses, links] = await Promise.all([
      db.select({ slug: grades.slug }).from(grades).where(eq(grades.isActive, true)),
      db.select({ slug: courses.slug, updatedAt: courses.updatedAt }).from(courses).where(eq(courses.status, "PUBLISHED")),
      db
        .select({ gradeSlug: grades.slug, subjectSlug: subjects.slug })
        .from(gradeSubjects)
        .innerJoin(grades, eq(gradeSubjects.gradeId, grades.id))
        .innerJoin(subjects, eq(gradeSubjects.subjectId, subjects.id))
        .where(and(eq(grades.isActive, true), eq(subjects.isActive, true), eq(gradeSubjects.isActive, true))),
    ]);

    for (const g of allGrades) {
      entries.push({ url: `${base}/explore/${g.slug}`, changeFrequency: "weekly", priority: 0.8 });
    }
    for (const l of links) {
      entries.push({ url: `${base}/explore/${l.gradeSlug}/${l.subjectSlug}`, changeFrequency: "weekly", priority: 0.7 });
    }
    for (const c of publishedCourses) {      entries.push({
        url: `${base}/courses/${c.slug}`,
        lastModified: c.updatedAt ?? undefined,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // Build-safe: if DB is unreachable during prerender, ship static routes only.
  }

  return entries;
}
