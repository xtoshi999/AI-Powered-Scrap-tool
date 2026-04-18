import mongoose from "mongoose";

/** Per-user counts of profile marks, bucketed by UTC calendar day (resets at UTC midnight). */
const DailyMarkStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  dayKey: { type: String, required: true },
  visited: { type: Number, default: 0 },
  sent: { type: Number, default: 0 },
  good: { type: Number, default: 0 },
  bad: { type: Number, default: 0 },
});

DailyMarkStatsSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

export const DailyMarkStats =
  mongoose.models.DailyMarkStats ||
  mongoose.model("DailyMarkStats", DailyMarkStatsSchema);
