import { NextResponse } from "next/server";
import { getScraperProgress } from "@/lib/backgroundScraper";

export async function GET() {
  const progress = getScraperProgress();
  const now = Date.now();
  const elapsedMs = progress.startedAt > 0 ? Math.max(0, now - progress.startedAt) : 0;
  return NextResponse.json({ ...progress, elapsedMs });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "clear") {
      const progress = getScraperProgress();
      const wasRunning = progress.running;
      
      // Reset all stats but keep running state
      progress.startedAt = wasRunning ? Date.now() : 0;
      progress.scraped = 0;
      progress.added = 0;
      progress.updated = 0;
      progress.removed = 0;
      progress.lastUserId = "";

      return NextResponse.json({ ok: true, cleared: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


