import { NextResponse } from "next/server";
import {
  startBackgroundScraper,
  stopBackgroundScraper,
  type ScrapeMode,
} from "@/lib/backgroundScraper";

function parseMode(value: unknown): ScrapeMode {
  if (value === "next") return "next";
  return "database";
}

export async function POST(request: Request) {
  const body = (await request.json()) as { action?: string; mode?: string };
  const { action, mode } = body;

  // Stop action
  if (action === "stop") {
    stopBackgroundScraper();
    return NextResponse.json({ ok: true, running: false });
  }

  // Start action (default)
  try {
    const started = await startBackgroundScraper(parseMode(mode));
    return NextResponse.json({
      ok: true,
      started,
      mode: parseMode(mode),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("Scraping error details:", {
      message: errorMessage,
    });

    return NextResponse.json({ error: `Failed to start scraper: ${errorMessage}` }, { status: 500 });
  }
}
