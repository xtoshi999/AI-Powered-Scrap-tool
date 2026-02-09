import { NextResponse } from "next/server";
import { startBackgroundScraper } from "@/lib/backgroundScraper";

// This will be called when the API route is first loaded
let initialized = false;

export async function GET() {
  if (!initialized) {
    initialized = true;
    // Start the background scraper
    startBackgroundScraper();
    return NextResponse.json({ message: "Background scraper initialized" });
  }
  return NextResponse.json({ message: "Background scraper already running" });
}
