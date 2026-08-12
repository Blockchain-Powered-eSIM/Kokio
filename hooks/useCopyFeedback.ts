import { useCallback, useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { logger } from "@/utils/logger";

/**
 * Copy-to-clipboard with transient "copied" feedback.
 * Clears any pending reset timer on re-copy and on unmount, so rapid repeated
 * copies don't race (an earlier timer resetting mid-way through the next one).
 */
export function useCopyFeedback(resetMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const copy = useCallback(
    async (value: string) => {
      try {
        await Clipboard.setStringAsync(value);
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), resetMs);
      } catch (err) {
        logger.error("CLIPBOARD_COPY_FAILED", { err });
      }
    },
    [resetMs],
  );

  return { copied, copy };
}
