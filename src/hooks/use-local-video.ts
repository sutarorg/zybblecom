"use client";
import { useEffect, useState } from "react";
export function useLocalVideo(file: File | null) {
  const [reading, setReading] = useState<{
    file: File;
    duration?: number;
    width?: number;
    height?: number;
  }>();
  useEffect(() => {
    if (!file) return;
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      setReading({
        file,
        duration:
          Number.isFinite(video.duration) && video.duration > 0
            ? video.duration
            : undefined,
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
      });
    video.onerror = () => setReading({ file });
    video.src = url;
    return () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return reading?.file === file ? reading : null;
}
