import playwright from "playwright";
import { connectDB } from "@/lib/mongodb";
import { Profile } from "@/models/Profile";
import { parseStartupSchoolProfile } from "@/lib/parseStartupSchoolProfile";

export type ScrapeMode = "next" | "database";

/** After this many failed fetch attempts in database mode, the profile row is removed (likely gone from Startup School). */
const MAX_DB_FETCH_FAILURES = 3;
/** If a scraper crashes mid-cycle, allow reclaim after this duration. */
const SCRAPE_LOCK_TIMEOUT_MS = 2 * 60 * 1000;
const BANNED_COUNTRIES = new Set([
  "colombia",
  "india",
  "pakistan",
  "tanzania",
  "nigeria",
  "japan",
  'china',
  'indonesia',
  'ukraine',
  'africa'
]);

type ScrapeProgress = {
  running: boolean;
  startedAt: number;
  scraped: number;
  added: number;
  updated: number;
  /** Profiles removed after MAX_DB_FETCH_FAILURES consecutive failures (database mode only). */
  removed: number;
  lastUserId: string;
  mode: ScrapeMode;
};

function getProgress(): ScrapeProgress {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (!globalThis.__SCRAPE_PROGRESS__) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.__SCRAPE_PROGRESS__ = {
      running: false,
      startedAt: 0,
      scraped: 0,
      added: 0,
      updated: 0,
      removed: 0,
      lastUserId: "",
      mode: "database",
    } as ScrapeProgress;
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return globalThis.__SCRAPE_PROGRESS__ as ScrapeProgress;
}

function getCandidateBaseUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (site) return site;
  const fetchUrl = process.env.NEXT_PUBLIC_FETCH_URL ?? "";
  const idx = fetchUrl.indexOf("/candidate");
  if (idx !== -1) {
    return fetchUrl.slice(0, idx + "/candidate".length);
  }
  return "https://www.startupschool.org/cofounder-matching/candidate";
}

function getCountryFromLocation(location: string | undefined): string {
  if (!location) return "";
  const parts = location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return (parts[parts.length - 1] || "").toLowerCase();
}

async function recordDatabaseFetchFailure(
  userId: string | undefined
): Promise<"deleted" | "tracked" | "skipped"> {
  if (!userId) return "skipped";
  const updated = await Profile.findOneAndUpdate(
    { userId },
    { $inc: { scrapeFailCount: 1 }, $currentDate: { updatedAt: true } },
    { new: true }
  );
  if (!updated) return "skipped";
  const n = updated.scrapeFailCount ?? 0;
  if (n >= MAX_DB_FETCH_FAILURES) {
    await Profile.deleteOne({ userId });
    console.warn(
      `🗑️ Removed profile ${userId} after ${MAX_DB_FETCH_FAILURES} failed fetch attempts (not on platform or unreachable).`
    );
    return "deleted";
  }
  console.warn(
    `⚠️ Fetch failure ${n}/${MAX_DB_FETCH_FAILURES} for ${userId} (will remove at ${MAX_DB_FETCH_FAILURES}).`
  );
  return "tracked";
}

async function claimOldestProfileForDatabaseMode(): Promise<
  { _id?: { toString: () => string }; userId?: string } | null
> {
  const lockExpiredBefore = new Date(Date.now() - SCRAPE_LOCK_TIMEOUT_MS);
  return (await Profile.findOneAndUpdate(
    {
      userId: { $exists: true, $nin: [null, ""] },
      $or: [
        { scrapeLockedAt: { $exists: false } },
        { scrapeLockedAt: null },
        { scrapeLockedAt: { $lt: lockExpiredBefore } },
      ],
    },
    { $set: { scrapeLockedAt: new Date() } },
    {
      sort: { updatedAt: 1, userId: 1 },
      new: true,
      projection: { _id: 1, userId: 1, updatedAt: 1 },
    }
  ).lean()) as { _id?: { toString: () => string }; userId?: string } | null;
}

async function releaseDatabaseScrapeLock(docId: string | undefined): Promise<void> {
  if (!docId) return;
  await Profile.updateOne({ _id: docId }, { $unset: { scrapeLockedAt: "" } });
}

let scraperRunning = false;

/** @returns true if a new scraper loop was started; false if already running or validation failed. */
export async function startBackgroundScraper(
  mode: ScrapeMode = "database"
): Promise<boolean> {
  if (scraperRunning) {
    console.log("Background scraper already running");
    return false;
  }
  // Claim synchronously so concurrent API calls cannot each start a loop (they would scrape the same stalest row twice).
  scraperRunning = true;

  const ssoKey = process.env.NEXT_PUBLIC_SSO_KEY ?? "";
  const susSession = process.env.NEXT_PUBLIC_SUS_SESSION ?? "";
  const nextUrl = process.env.NEXT_PUBLIC_FETCH_URL ?? "";

  if (!ssoKey || !susSession) {
    console.error("Missing required environment variables for scraping");
    scraperRunning = false;
    return false;
  }

  if (mode === "next" && !nextUrl) {
    console.error("NEXT_PUBLIC_FETCH_URL is required for next-candidate mode");
    scraperRunning = false;
    return false;
  }

  const progress = getProgress();
  progress.running = true;
  progress.startedAt = Date.now();
  progress.mode = mode;

  console.log(`🚀 Starting background scraper (${mode} mode)...`);

  (async () => {
    let browser: playwright.Browser | undefined;

    try {
      await connectDB();

      browser = await playwright.chromium.launch({ headless: true });
      const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: { "Accept-Encoding": "gzip, deflate, br" },
      });
      const page = await context.newPage();

      await page.route("**/*.{png,jpg,jpeg,gif,css}", (route) => route.abort());
      await page.route("**/*.{woff,woff2,ttf,otf}", (route) => route.abort());
      await page.route("**/{analytics,tracking,advertisement}/**", (route) =>
        route.abort()
      );

      await context.addCookies([
        { name: "_sso.key", value: ssoKey, domain: ".startupschool.org", path: "/" },
        { name: "_sus_session", value: susSession, domain: ".startupschool.org", path: "/" },
      ]);

      const baseUrl = getCandidateBaseUrl();

      while (getProgress().running) {
        let expectedDbUserId: string | undefined;
        let expectedDbDocId: string | undefined;
        try {
          if (mode === "database") {
            const stalest = await claimOldestProfileForDatabaseMode();

            if (!stalest?.userId) {
              console.warn("No claimable profiles in database; retrying in 10s...");
              await new Promise((r) => setTimeout(r, 10000));
              continue;
            }

            expectedDbUserId = stalest.userId;
            expectedDbDocId = stalest._id?.toString();
            const profileUrl = `${baseUrl}/${expectedDbUserId}`;
            await page.goto(profileUrl, {
              waitUntil: "domcontentloaded",
              timeout: 60000,
            });
          } else {
            await page.goto(nextUrl, {
              waitUntil: "domcontentloaded",
              timeout: 60000,
            });
          }

          await page.waitForSelector(".css-139x40p", { timeout: 20000 });

          const content = await page.content();
          const profile = parseStartupSchoolProfile(content, page.url());
          if (!profile) {
            console.error("Could not parse profile from page:", page.url());
            if (mode === "database") {
              const p = getProgress();
              const out = await recordDatabaseFetchFailure(expectedDbUserId);
              if (out === "deleted") p.removed += 1;
              await releaseDatabaseScrapeLock(expectedDbDocId);
            }
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }

          const p = getProgress();

          const country = getCountryFromLocation(profile.location);
          const isBannedCountry = BANNED_COUNTRIES.has(country);
          if (isBannedCountry) {
            if (mode === "database" && expectedDbDocId) {
              const removed = await Profile.deleteOne({ _id: expectedDbDocId });
              if (removed.deletedCount > 0) {
                p.removed += 1;
              }
              console.log(
                `🚫 REMOVED (banned country: ${country}): ${expectedDbUserId}`
              );
            } else {
              console.log(
                `🚫 SKIPPED (banned country: ${country}): ${profile.userId}`
              );
            }
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }

          if (mode === "database" && expectedDbUserId) {
            if (profile.userId !== expectedDbUserId) {
              console.warn(
                `Database cycle: URL id ${expectedDbUserId} ≠ parsed page id ${profile.userId}; skip update (no insert).`
              );
              const out = await recordDatabaseFetchFailure(expectedDbUserId);
              if (out === "deleted") p.removed += 1;
              await releaseDatabaseScrapeLock(expectedDbDocId);
              await new Promise((r) => setTimeout(r, 3000));
              continue;
            }

            const result = await Profile.findOneAndUpdate(
              expectedDbDocId
                ? { _id: expectedDbDocId, userId: expectedDbUserId }
                : { userId: expectedDbUserId },
              {
                $set: { ...profile, scrapeFailCount: 0 },
                $unset: { scrapeLockedAt: "" },
                $currentDate: { updatedAt: true },
              },
              { upsert: false, new: true }
            );

            if (!result) {
              console.warn(
                `Database cycle (oldest first): no document for userId ${expectedDbUserId} (removed from DB?); skip.`
              );
              await releaseDatabaseScrapeLock(expectedDbDocId);
              await new Promise((r) => setTimeout(r, 3000));
              continue;
            }

            p.scraped += 1;
            p.updated += 1;
            p.lastUserId = expectedDbUserId;
            console.log(
              `✅ UPDATED (stalest first): ${expectedDbUserId} | Total: ${p.scraped} (Added: ${p.added}, Updated: ${p.updated})`
            );
          } else {
            if (p.lastUserId && p.lastUserId === profile.userId) {
              console.log(
                `↩️ SKIPPED DUPLICATE (next mode): ${profile.userId} (same as previous cycle)`
              );
              await new Promise((r) => setTimeout(r, 1500));
              continue;
            }

            const existing = await Profile.findOne({ userId: profile.userId });
            const result = await Profile.findOneAndUpdate(
              { userId: profile.userId },
              {
                $set: { ...profile, scrapeFailCount: 0 },
                $currentDate: { updatedAt: true },
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            p.scraped += 1;
            p.lastUserId = profile.userId as string;

            let action = "scraped";
            if (!existing && result) {
              p.added += 1;
              action = "added (new)";
            } else if (existing) {
              p.updated += 1;
              action = "updated (existing)";
            }

            console.log(
              `✅ ${action.toUpperCase()}: ${profile.userId} | Total: ${p.scraped} (Added: ${p.added}, Updated: ${p.updated})`
            );
          }

          await new Promise((r) => setTimeout(r, 3000));
        } catch (err) {
          console.error("Error scraping profile:", err);
          if (mode === "database") {
            const p = getProgress();
            const out = await recordDatabaseFetchFailure(expectedDbUserId);
            if (out === "deleted") p.removed += 1;
            await releaseDatabaseScrapeLock(expectedDbDocId);
          }
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    } catch (err) {
      console.error("Background scraper error:", err);
    } finally {
      const p = getProgress();
      p.running = false;
      scraperRunning = false;
      try {
        await browser?.close();
      } catch {
        /* ignore */
      }
      console.log("🛑 Background scraper stopped");
    }
  })();

  return true;
}

export function stopBackgroundScraper() {
  const progress = getProgress();
  progress.running = false;
  scraperRunning = false;
  console.log("⏸️  Stopping background scraper...");
}

export function getScraperProgress() {
  return getProgress();
}
