import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons, courseModules, courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { generateStorageKey, uploadBuffer } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const teacher = await requireRole("TEACHER", "ADMIN");
    const formData = await req.formData();
    const lessonId = String(formData.get("lessonId") || "");
    const file = formData.get("file");

    if (!lessonId || !(file instanceof File)) {
      return NextResponse.json({ error: "بيانات الرفع غير مكتملة" }, { status: 400 });
    }
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: "الملف يجب أن يكون فيديو" }, { status: 400 });
    }
    const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1GB
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "الحد الأقصى لحجم الفيديو هو 1 جيجابايت" }, { status: 400 });
    }

    const ownershipRows = await db
      .select({ course: courses })
      .from(lessons)
      .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
      .innerJoin(courses, eq(courseModules.courseId, courses.id))
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (!ownershipRows.length) return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
    if (teacher.role !== "ADMIN" && ownershipRows[0].course.teacherId !== teacher.id) {
      return NextResponse.json({ error: "لا تملك صلاحية رفع فيديو لهذا الدرس" }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storageKey = generateStorageKey(`videos/${lessonId}`, file.name);
    const result = await uploadBuffer(storageKey, buffer, file.type);

    return NextResponse.json({
      ...result,
      originalFileName: file.name,
      sizeBytes: file.size,
    });
  } catch (error) {
    // Never leak internal/DB error details to the client.
    console.error("video upload failed:", error);
    return NextResponse.json({ error: "فشل رفع الفيديو. حاول مرة أخرى" }, { status: 500 });
  }
}
