"use client";

/**
 * SSR-safe timestamp components.
 *
 * `formatDistanceToNow` and `format` from date-fns are time- and locale-
 * sensitive, so the value rendered on the server inevitably differs from
 * the value rendered on the client at hydration time. To avoid hydration
 * mismatches, these components render nothing on the server / first
 * client render, then swap in the real value after mount.
 *
 * The `<time>` element keeps the markup semantic and gives screen readers
 * the machine-readable ISO timestamp via the `dateTime` attribute, even
 * before the human-readable text appears.
 */

import { useEffect, useState, type HTMLAttributes } from "react";
import { format as formatDate, formatDistanceToNow } from "date-fns";

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function toIso(date: string | Date): string {
  return typeof date === "string" ? date : date.toISOString();
}

export interface RelativeTimeProps
  extends Omit<HTMLAttributes<HTMLTimeElement>, "dateTime"> {
  date: string | Date;
  addSuffix?: boolean;
}

/** Renders e.g. "3 hours ago" — only after client mount. */
export function RelativeTime({
  date,
  addSuffix = true,
  ...rest
}: RelativeTimeProps) {
  const mounted = useMounted();
  const iso = toIso(date);
  return (
    <time dateTime={iso} suppressHydrationWarning {...rest}>
      {mounted ? formatDistanceToNow(new Date(iso), { addSuffix }) : "\u00A0"}
    </time>
  );
}

export interface AbsoluteTimeProps
  extends Omit<HTMLAttributes<HTMLTimeElement>, "dateTime"> {
  date: string | Date;
  /** date-fns format string. Defaults to "MMM d, h:mm a". */
  pattern?: string;
}

/** Renders an absolute-time string (e.g. "May 18, 4:12 PM") only after mount. */
export function AbsoluteTime({
  date,
  pattern = "MMM d, h:mm a",
  ...rest
}: AbsoluteTimeProps) {
  const mounted = useMounted();
  const iso = toIso(date);
  return (
    <time dateTime={iso} suppressHydrationWarning {...rest}>
      {mounted ? formatDate(new Date(iso), pattern) : "\u00A0"}
    </time>
  );
}
