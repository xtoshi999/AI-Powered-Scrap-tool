import { connectDB } from "@/lib/mongodb";
import { DailyMarkStats } from "@/models/DailyMarkStats";

export type MarkKind = "visited" | "sent" | "good" | "bad";

export function getUtcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Normalize a value from Profile.viewers Map (legacy booleans or strings). */
export function normalizeViewerStatus(value: unknown): MarkKind | null {
  if (value === true || value === "good") return "good";
  if (value === false || value === "bad") return "bad";
  if (value === "visited" || value === "sent") return value;
  return null;
}

/**
 * Increment today's counter for `next` when the user changes a profile's mark
 * to a new non-yet status (no-op if unchanged).
 */
export async function recordMarkIfChanged(
  userId: string,
  previous: MarkKind | null,
  next: MarkKind | null
): Promise<void> {
  if (next === null) return;
  if (previous === next) return;

  const dayKey = getUtcDayKey();
  const uid = String(userId);

  await connectDB();
  await DailyMarkStats.findOneAndUpdate(
    { userId: uid, dayKey },
    { $inc: { [next]: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export type TodayMarkStats = {
  dayKey: string;
  visited: number;
  sent: number;
  good: number;
  bad: number;
};

export async function getTodayStatsForUser(userId: string): Promise<TodayMarkStats> {
  const dayKey = getUtcDayKey();
  const uid = String(userId);

  await connectDB();
  const doc = await DailyMarkStats.findOne({ userId: uid, dayKey })
    .lean()
    .exec();

  const row = doc && !Array.isArray(doc) ? doc : null;

  return {
    dayKey,
    visited: row?.visited ?? 0,
    sent: row?.sent ?? 0,
    good: row?.good ?? 0,
    bad: row?.bad ?? 0,
  };
}
