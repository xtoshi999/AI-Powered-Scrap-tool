import { NextResponse } from "next/server";
import { startBackgroundScraper, stopBackgroundScraper } from "@/lib/backgroundScraper";

export async function POST(request: Request) {
  const body = (await request.json()) as { action?: string };
  const { action } = body;

  // Stop action
  if (action === "stop") {
    stopBackgroundScraper();
    return NextResponse.json({ ok: true, running: false });
  }

  // Start action (default)
  try {
    startBackgroundScraper();
    return NextResponse.json({ ok: true, started: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("Scraping error details:", {
      message: errorMessage,
    });

    return NextResponse.json({ error: `Failed to start scraper: ${errorMessage}` }, { status: 500 });
  }
}
