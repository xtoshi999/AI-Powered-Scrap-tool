import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema({
  userId: { type: String, index: true, unique: true, sparse: true },
  name: String,
  location: String,
  age: {
    type: Number,
    required: false,
    default: null,
  },
  lastSeen: String,
  /** Approximate minutes since last co-founder-matching activity; derived from `lastSeen` text for filtering. */
  lastSeenMinutesApprox: { type: Number, required: false, index: true },
  avatar: String,
  sumary: String,
  intro: String,
  lifeStory: String,
  freeTime: String,
  other: String,
  accomplishments: String,
  education: [String],
  employment: [String],
  startup: {
    name: String,
    description: String,
    progress: String,
    funding: String,
  },
  cofounderPreferences: {
    requirements: [String],
    idealPersonality: String,
    equity: String,
  },
  interests: {
    shared: [String],
    personal: [String],
  },
  linkedIn: String,
  /** Database-mode scraper: consecutive failed fetches (missing/invalid on platform). Reset on success. */
  scrapeFailCount: { type: Number, default: 0 },
  /** Temporary claim lock for database-mode oldest-first scraping. */
  scrapeLockedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, index: true },
  status: {
    type: String,
    enum: ["default", "active", "pending", "archived"],
    default: "default",
  },
  viewers: {
    type: Map,
    of: String, // Changed from Boolean to String to support "good", "bad", "yet", "visited"
    default: new Map(),
  }
});

export const Profile =
  mongoose.models.Profile || mongoose.model("Profile", ProfileSchema);
