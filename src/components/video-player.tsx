"use client";

import { useEffect, useRef } from "react";
import { updateVideoProgressAction } from "@/server/actions/learning";

export function VideoPlayer({
  lessonId,
  src,
  poster,
  initialPosition = 0,
}: {
  lessonId: string;
  src: string;
  poster?: string | null;
  initialPosition?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaved = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      if (initialPosition > 2 && initialPosition < video.duration - 3) {
        video.currentTime = initialPosition;
      }
    };

    const reportProgress = () => {
      const now = Date.now();
      if (now - lastSaved.current < 8000) return;
      lastSaved.current = now;
      if (video.duration > 0) {
        void updateVideoProgressAction(lessonId, Math.floor(video.currentTime), Math.floor(video.duration));
      }
    };

    const handlePauseOrEnd = () => {
      if (video.duration > 0) {
        void updateVideoProgressAction(lessonId, Math.floor(video.currentTime), Math.floor(video.duration));
      }
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("timeupdate", reportProgress);
    video.addEventListener("pause", handlePauseOrEnd);
    video.addEventListener("ended", handlePauseOrEnd);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("timeupdate", reportProgress);
      video.removeEventListener("pause", handlePauseOrEnd);
      video.removeEventListener("ended", handlePauseOrEnd);
    };
  }, [lessonId, initialPosition]);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-black shadow-lg">
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        controls
        controlsList="nodownload"
        className="aspect-video w-full bg-black"
      />
    </div>
  );
}
