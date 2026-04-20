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

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;
/** 30-day months, consistent with existing presets. */
const MINUTES_PER_MONTH = 30 * MINUTES_PER_DAY;

/** Convert a numeric amount + unit letter to a minute threshold. */
function amountAndUnitToMinutes(n: number, unit: string): number | null {
  const u = unit.toLowerCase();
  if (u === "h") return n * MINUTES_PER_HOUR;
  if (u === "d") return n * MINUTES_PER_DAY;
  if (u === "w") return n * MINUTES_PER_WEEK;
  if (u === "m") return n * MINUTES_PER_MONTH;
  return null;
}

/** Max minutes since last seen (inclusive). Uses 30-day months. */
export function lastSeenWithinToMaxMinutes(
  value: string
): number | null {
  const day = MINUTES_PER_DAY;
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

export type LastSeenFilterParsed =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "within"; maxMinutes: number }
  | { kind: "older"; minMinutes: number };

/**
 * Parses freeform last-seen filter input, e.g. "<20d", "<1m", ">2m", ">3d", "48h", "7d" (legacy presets).
 * - `<` = last activity at most this long ago (more recent than the cutoff).
 * - `>` = last activity longer ago than this (older than the cutoff).
 * Bare `20d` / `1m` is treated like `<20d` / `<1m`.
 */
export function parseLastSeenFilterInput(
  raw: string | null | undefined
): LastSeenFilterParsed {
  if (raw == null) return { kind: "none" };
  const s = raw.trim();
  if (s === "") return { kind: "none" };

  const withOp = s.match(/^(<|>)\s*(\d+)\s*([hHdDmMwW])\s*$/);
  if (withOp) {
    const op = withOp[1];
    const n = parseInt(withOp[2], 10);
    const minutes = amountAndUnitToMinutes(n, withOp[3]);
    if (minutes === null || !Number.isFinite(minutes)) return { kind: "invalid" };
    if (op === "<") return { kind: "within", maxMinutes: minutes };
    return { kind: "older", minMinutes: minutes };
  }

  const bare = s.match(/^(\d+)\s*([hHdDmMwW])\s*$/);
  if (bare) {
    const n = parseInt(bare[1], 10);
    const minutes = amountAndUnitToMinutes(n, bare[2]);
    if (minutes === null || !Number.isFinite(minutes)) return { kind: "invalid" };
    return { kind: "within", maxMinutes: minutes };
  }

  const legacy = lastSeenWithinToMaxMinutes(s);
  if (legacy !== null) return { kind: "within", maxMinutes: legacy };

  return { kind: "invalid" };
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

/** True if last seen is strictly older than minMinutesSinceSeen (less recent). */
export function profileOlderThanLastSeenThreshold(
  row: {
    lastSeen?: string | null;
    lastSeenMinutesApprox?: number | null;
  },
  minMinutesSinceSeen: number
): boolean {
  const minutes =
    typeof row.lastSeenMinutesApprox === "number" &&
    !Number.isNaN(row.lastSeenMinutesApprox)
      ? row.lastSeenMinutesApprox
      : parseLastSeenToApproximateMinutes(row.lastSeen ?? "");
  if (minutes === null) return false;
  return minutes > minMinutesSinceSeen;
}
