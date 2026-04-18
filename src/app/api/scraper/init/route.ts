import { NextResponse } from "next/server";
import { startBackgroundScraper } from "@/lib/backgroundScraper";

export async function GET() {
  const started = await startBackgroundScraper();
  return NextResponse.json({
    message: started
      ? "Background scraper initialized"
      : "Background scraper already running",
    started,
  });
}
