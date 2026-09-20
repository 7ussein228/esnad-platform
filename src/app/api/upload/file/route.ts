import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { generateStorageKey, uploadBuffer } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_FOLDERS = new Set(["lesson-files", "thumbnails", "documents", "maps", "submissions", "attachments"]);
// Content folders are teacher-only; students may only upload submissions/attachments.
const TEACHER_ONLY_FOLDERS = new Set(["lesson-files", "thumbnails", "documents", "maps"]);

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const formData = await req.formData();
    const file = formData.get("file");
    const folderRaw = String(formData.get("folder") || "attachments");
    const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "attachments";
    if (TEACHER_ONLY_FOLDERS.has(folder) && user.role !== "TEACHER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح لك بالرفع في هذا القسم" }, { status: 403 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "لم يتم إرسال أي ملف" }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "الحد الأقصى لحجم الملف هو 50 ميجابايت" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storageKey = generateStorageKey(`${folder}/${user.id}`, file.name);
    const result = await uploadBuffer(storageKey, buffer, file.type || "application/octet-stream");

    return NextResponse.json({ ...result, originalFileName: file.name, sizeBytes: file.size });
  } catch (error) {
    // Never leak internal/DB error details to the client.
    console.error("file upload failed:", error);
    return NextResponse.json({ error: "فشل رفع الملف. حاول مرة أخرى" }, { status: 500 });
  }
}
