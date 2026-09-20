"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ProgressBar, Alert } from "@/components/ui";
import { saveVideoAssetAction, saveLessonFileAction } from "@/server/actions/courses";

function xhrUpload(url: string, formData: FormData, onProgress: (pct: number) => void) {
  return new Promise<{ url: string; storageKey: string; provider: string; originalFileName: string; sizeBytes: number }>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || "فشل الرفع"));
        } catch {
          reject(new Error("فشل الرفع"));
        }
      };
      xhr.onerror = () => reject(new Error("حدث خطأ في الاتصال أثناء الرفع"));
      xhr.send(formData);
    }
  );
}

export function VideoUploader({ lessonId }: { lessonId: string }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError("");
    setFileMeta({ name: file.name, size: file.size });
    setStatus("uploading");
    setProgress(0);

    const duration = await new Promise<number>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => resolve(v.duration || 0);
      v.onerror = () => resolve(0);
      v.src = URL.createObjectURL(file);
    });

    try {
      const form = new FormData();
      form.append("lessonId", lessonId);
      form.append("file", file);
      const uploaded = await xhrUpload("/api/upload/video", form, setProgress);

      setStatus("saving");
      const metaForm = new FormData();
      metaForm.append("provider", uploaded.provider);
      metaForm.append("storageKey", uploaded.storageKey);
      metaForm.append("url", uploaded.url);
      metaForm.append("originalFileName", uploaded.originalFileName || file.name);
      metaForm.append("sizeBytes", String(uploaded.sizeBytes || file.size));
      metaForm.append("durationSeconds", String(Math.round(duration)));

      startTransition(async () => {
        const result = await saveVideoAssetAction(lessonId, metaForm);
        if (result?.error) {
          setError(result.error);
          setStatus("error");
        } else {
          setStatus("done");
          router.refresh();
        }
      });
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-primary-300 bg-primary-50/40 p-4">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-800">رفع فيديو الشرح</p>
          <p className="text-xs text-ink-500">MP4, MOV — يُرفع مباشرة إلى مساحة التخزين الخارجية</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={status === "uploading" || status === "saving"}>
          اختيار ملف الفيديو
        </Button>
      </div>

      {fileMeta && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-600">
            <span>{fileMeta.name}</span>
            <span>{(fileMeta.size / (1024 * 1024)).toFixed(1)} MB</span>
          </div>
          {(status === "uploading" || status === "saving") && (
            <>
              <ProgressBar value={status === "saving" ? 100 : progress} />
              <p className="text-xs text-primary-700">{status === "saving" ? "جارٍ حفظ بيانات الفيديو..." : `جارٍ الرفع... ${progress}%`}</p>
            </>
          )}
          {status === "done" && <Alert tone="success">تم رفع الفيديو ونشره بنجاح ✅</Alert>}
          {status === "error" && <Alert tone="error">{error || "حدث خطأ أثناء الرفع"}</Alert>}
        </div>
      )}
    </div>
  );
}

export function FileUploader({
  lessonId,
  folder = "lesson-files",
  fileType = "pdf",
  accept = ".pdf,.doc,.docx,image/*",
}: {
  lessonId: string;
  folder?: string;
  fileType?: string;
  accept?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError("");
    setStatus("uploading");
    setProgress(0);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const uploaded = await xhrUpload("/api/upload/file", form, setProgress);

      setStatus("saving");
      const metaForm = new FormData();
      metaForm.append("title", title || file.name);
      metaForm.append("fileUrl", uploaded.url);
      metaForm.append("fileType", fileType);
      metaForm.append("sizeBytes", String(uploaded.sizeBytes || file.size));

      startTransition(async () => {
        const result = await saveLessonFileAction(lessonId, metaForm);
        if (result?.error) {
          setError(result.error);
          setStatus("error");
        } else {
          setStatus("done");
          setTitle("");
          router.refresh();
        }
      });
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-gold-300 bg-gold-50/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="اسم الملف (اختياري)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-[180px] flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm"
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={status === "uploading" || status === "saving"}>
          رفع ملف PDF / مستند
        </Button>
      </div>
      {(status === "uploading" || status === "saving") && (
        <div className="mt-2">
          <ProgressBar value={status === "saving" ? 100 : progress} />
        </div>
      )}
      {status === "done" && <p className="mt-2 text-xs font-semibold text-[--color-success]">تم رفع الملف بنجاح ✅</p>}
      {status === "error" && <p className="mt-2 text-xs font-semibold text-[--color-error]">{error}</p>}
    </div>
  );
}

/** Generic uploader that returns the uploaded URL into a hidden input for an outer form. */
export function GenericUrlUploader({
  hiddenInputName,
  folder,
  accept,
  label,
}: {
  hiddenInputName: string;
  folder: string;
  accept: string;
  label: string;
}) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus("uploading");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const uploaded = await xhrUpload("/api/upload/file", form, setProgress);
      setUrl(uploaded.url);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <input type="hidden" name={hiddenInputName} value={url} readOnly />
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
        {status === "done" ? "تم الرفع، اختيار ملف آخر" : label}
      </Button>
      {status === "uploading" && <span className="mr-2 text-xs text-ink-500">{progress}%</span>}
      {status === "done" && <span className="mr-2 text-xs font-semibold text-[--color-success]">✔ جاهز</span>}
    </div>
  );
}
