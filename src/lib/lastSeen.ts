/**
 * Parses Startup School "last seen" copy (e.g. "19 days ago", "Last seen 2 hours ago")
 * into approximate minutes since activity. Lower = more recent.
 */
export function parseLastSeenToApproximateMinutes(
  lastSeen: string | null | undefined
): number | null {
  if (!lastSeen || typeof lastSeen !== "string") return null;
  const s = lastSeen.replace(/^\s*last seen\s+/i, "").trim();
  const m = s.match(
    /^(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago\s*$/i
  );
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const minute = 1;
  const hour = 60;
  const day = 24 * 60;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  if (unit.startsWith("second")) return n / 60;
  if (unit.startsWith("minute")) return n;
  if (unit.startsWith("hour")) return n * hour;
  if (unit.startsWith("day")) return n * day;
  if (unit.startsWith("week")) return n * week;
  if (unit.startsWith("month")) return n * month;
  if (unit.startsWith("year")) return n * year;
  return null;
}

/** Max minutes since last seen (inclusive). Uses 30-day months. */
export function lastSeenWithinToMaxMinutes(
  value: string
): number | null {
  const day = 24 * 60;
  switch (value) {
    case "1d":
      return 1 * day;
    case "7d":
      return 7 * day;
    case "15d":
      return 15 * day;
    case "1m":
      return 30 * day;
    case "2m":
      return 2 * 30 * day;
    case "3m":
      return 3 * 30 * day;
    default:
      return null;
  }
}

export function isLastSeenWithinParam(
  value: string | null
): value is "1d" | "7d" | "15d" | "1m" | "2m" | "3m" {
  return (
    value === "1d" ||
    value === "7d" ||
    value === "15d" ||
    value === "1m" ||
    value === "2m" ||
    value === "3m"
  );
}

export function profileWithinLastSeenThreshold(
  row: {
    lastSeen?: string | null;
    lastSeenMinutesApprox?: number | null;
  },
  maxMinutesSinceSeen: number
): boolean {
  const minutes =
    typeof row.lastSeenMinutesApprox === "number" &&
    !Number.isNaN(row.lastSeenMinutesApprox)
      ? row.lastSeenMinutesApprox
      : parseLastSeenToApproximateMinutes(row.lastSeen ?? "");
  if (minutes === null) return false;
  return minutes <= maxMinutesSinceSeen;
}
