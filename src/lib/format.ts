import { format, formatDistanceToNowStrict } from "date-fns";
import { TZDate } from "@date-fns/tz";

/** Human-readable file size. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "Jul 20, 2026" (or empty for null). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : format(d, "MMM d, yyyy");
}

/** Interview date + time rendered in a specific IANA zone. */
export function formatInterviewTime(
  iso: string | null | undefined,
  timezone: string | null | undefined,
): string {
  if (!iso) return "";
  const zone = timezone || "UTC";
  try {
    const zoned = new TZDate(new Date(iso), zone);
    return `${format(zoned, "EEE, MMM d, yyyy 'at' h:mm a")} (${zone})`;
  } catch {
    return format(new Date(iso), "MMM d, yyyy");
  }
}

/** "in 3 days" / "2 hours ago". */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDistanceToNowStrict(d, { addSuffix: true });
}
