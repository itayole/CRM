// Server-side helpers for the lead activity log.
// Activity is denormalized into Lead.activity as a JSON string of
// [{type,text,time,user}] entries (see prisma schema). These helpers append to
// that array without losing existing history and stamp a consistent timestamp.

export interface ActivityEntry {
  type: string; // "note" | "call" | "email" | "meeting" | "status"
  text: string;
  time: string;
  user: string;
}

// Hebrew labels for lead statuses, used when logging a status change. Kept here
// (not imported from the client-only mockData module) so API routes can use it.
export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "חדש",
  contacted: "פנייה",
  qualified: "מוסמך",
  disqualified: "נפסל",
  converted: "הומר לפרויקט",
};

// Compact, deterministic, TZ-stable stamp: "2026-06-14 13:45".
export function nowStamp(): string {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

// Append one entry to an existing activity JSON string, tolerating null/corrupt
// input. Returns the new JSON string ready to persist to Lead.activity.
export function appendActivity(existing: string | null, entry: ActivityEntry): string {
  let arr: ActivityEntry[] = [];
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      /* corrupt JSON — start fresh rather than throw */
    }
  }
  arr.push(entry);
  return JSON.stringify(arr);
}
