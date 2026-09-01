"use client";

import { useCallback, useRef, useState } from "react";
import type { AxiosResponse } from "axios";
import axios from "axios";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api/errors";

export interface UseExportFileOptions {
  fetchFn: () => Promise<AxiosResponse<Blob>>;
  filename: string;
  timeoutMs?: number;
}

export interface UseExportFileReturn {
  trigger: () => void;
  isExporting: boolean;
  error: string | null;
}

export function useExportFile(options: UseExportFileOptions): UseExportFileReturn {
  const { fetchFn, filename, timeoutMs = 30000 } = options;

  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    setError(null);

    let didTimeout = false;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutRef.current = setTimeout(() => {
        didTimeout = true;
        reject(new Error("EXPORT_TIMEOUT"));
      }, timeoutMs);
    });

    try {
      const response = await Promise.race([fetchFn(), timeoutPromise]);

      // Success — trigger browser download
      const contentType = response.headers?.["content-type"];
      const blob = new Blob([response.data], {
        type: typeof contentType === "string" ? contentType : "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (didTimeout || (err instanceof Error && err.message === "EXPORT_TIMEOUT")) {
        const msg = "Export timed out. Please try again.";
        setError(msg);
        toast.error(msg);
      } else if (axios.isCancel(err)) {
        const msg = "Export timed out. Please try again.";
        setError(msg);
        toast.error(msg);
      } else {
        const msg = getApiErrorMessage(err, "Export failed. Please try again.");
        setError(msg);
        toast.error(msg);
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsExporting(false);
    }
  }, [fetchFn, filename, timeoutMs, isExporting]);

  return { trigger, isExporting, error };
}
