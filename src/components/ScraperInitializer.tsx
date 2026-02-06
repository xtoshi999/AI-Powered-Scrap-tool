"use client";
import { useEffect } from "react";

export default function ScraperInitializer() {
  useEffect(() => {
    // Initialize the background scraper when the app loads
    fetch("/api/scraper/init")
      .then(() => console.log("Background scraper initialized"))
      .catch((err) => console.error("Failed to initialize scraper:", err));
  }, []);

  return null; // This component doesn't render anything
}
