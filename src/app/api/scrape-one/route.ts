import { NextResponse } from "next/server";
import playwright from "playwright";
import { connectDB } from "@/lib/mongodb";
import { Profile } from "@/models/Profile";
import {
  parseStartupSchoolProfile,
  STARTUP_SCHOOL_PROFILE_READY_SELECTOR,
  STARTUP_SCHOOL_PROFILE_WAIT_OPTIONS,
} from "@/lib/parseStartupSchoolProfile";

export async function POST(request: Request) {
  let { url, ssoKey, susSession } = await request.json();
  url = url || process.env.NEXT_PUBLIC_FETCH_URL;
  ssoKey = ssoKey || process.env.NEXT_PUBLIC_SSO_KEY;
  susSession = susSession || process.env.NEXT_PUBLIC_SUS_SESSION;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid URL format" + err },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    let browser;
    if (!browser) {
      browser = await playwright.chromium.launch();
    }
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        "Accept-Encoding": "gzip, deflate, br",
      },
    });
    const page = await context.newPage();

    await page.route("**/*.{png,jpg,jpeg,gif,css}", (route) => route.abort());
    await page.route("**/*.{woff,woff2,ttf,otf}", (route) => route.abort());
    await page.route("**/{analytics,tracking,advertisement}/**", (route) =>
      route.abort()
    );

    // Set cookies before navigation
    await context.addCookies([
      {
        name: "_sso.key",
        value: ssoKey,
        domain: ".startupschool.org",
        path: "/",
      },
      {
        name: "_sus_session",
        value: susSession,
        domain: ".startupschool.org",
        path: "/",
      },
    ]);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector(
      STARTUP_SCHOOL_PROFILE_READY_SELECTOR,
      STARTUP_SCHOOL_PROFILE_WAIT_OPTIONS
    );

    const content = await page.content();
    const profile = parseStartupSchoolProfile(content, page.url());
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Could not parse profile markup" },
        { status: 422 }
      );
    }

    // After scraping the profile data
    await Profile.findOneAndUpdate(
      { userId: profile.userId },
      {
        $set: { ...profile, scrapeFailCount: 0 },
        $currentDate: { updatedAt: true },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ ok: true, profile: profile }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "";

    console.error("Scraping error details:", {
      message: errorMessage,
      stack: errorStack,
      url: url,
    });

    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
