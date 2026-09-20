import { ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

/** Course cover: teacher-uploaded image, or a branded gradient fallback. */
export function CourseCover({
  thumbnailUrl,
  title,
  className,
}: {
  thumbnailUrl?: string | null;
  title: string;
  className?: string;
}) {
  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={`غلاف كورس ${title}`}
        loading="lazy"
        className={cn("h-32 w-full object-cover", className)}
      />
    );
  }
  return (
    <div className={cn("flex h-32 items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 text-white", className)}>
      <ScrollText className="h-10 w-10 opacity-80" />
    </div>
  );
}
