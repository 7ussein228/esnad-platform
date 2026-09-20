import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { generateStorageKey, uploadBuffer } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_FOLDERS = new Set(["lesson-files", "thumbnails", "documents", "maps", "submissions", "attachments"]);

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const formData = await req.formData();
    const file = formData.get("file");
    const folderRaw = String(formData.get("folder") || "attachments");
    const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "attachments";

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
    return NextResponse.json({ error: (error as Error).message || "فشل رفع الملف" }, { status: 500 });
  }
}
