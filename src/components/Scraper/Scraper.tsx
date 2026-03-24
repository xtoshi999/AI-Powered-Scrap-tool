"use client";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

type ScrapeMode = "next" | "database";

export default function ProfileScraper() {
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<ScrapeMode>("database");
  const [progress, setProgress] = useState({
    running: false,
    elapsedMs: 0,
    scraped: 0,
    added: 0,
    updated: 0,
    lastUserId: "",
    mode: "database" as ScrapeMode,
  });

  // Poll for status updates
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/scrape/status");
        if (!res.ok) return;
        const data = await res.json();
        setProgress({
          running: Boolean(data.running),
          elapsedMs: data.elapsedMs ?? 0,
          scraped: data.scraped ?? 0,
          added: data.added ?? 0,
          updated: data.updated ?? 0,
          lastUserId: data.lastUserId ?? "",
          mode: data.mode === "next" ? "next" : "database",
        });
        setRunning(Boolean(data?.running));
      } catch {
        // Silently fail
      }
    };
    
    // Always poll for status
    poll();
    const intervalId = setInterval(poll, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const handleStop = async () => {
    try {
      await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      setRunning(false);
      toast.info("Scraping stopped");
    } catch {}
  };

  const handleStart = async () => {
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (!response.ok) {
        toast.error("Failed to start scraping");
        return;
      }

      const data = await response.json();
      if (data?.started) {
        setRunning(true);
        toast.success(
          data.mode === "database"
            ? "Scraping started (database ID cycle)"
            : "Scraping started (next candidate)"
        );
      }
    } catch {
      toast.error("Error starting scraping");
    }
  };

  const handleClear = async () => {
    try {
      await fetch("/api/scrape/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      setProgress({
        running: progress.running,
        elapsedMs: 0,
        scraped: 0,
        added: 0,
        updated: 0,
        lastUserId: "",
        mode: progress.mode,
      });
      toast.success("Statistics cleared");
    } catch {
      toast.error("Failed to clear statistics");
    }
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hh = hours > 0 ? String(hours).padStart(2, "0") + ":" : "";
    return `${hh}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Background Profile Scraper</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Choose how profiles are loaded, then start. Status updates every second.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 mb-8">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Update method
        </span>
        <div
          className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-1 bg-gray-50 dark:bg-gray-900"
          role="group"
          aria-label="Scrape mode"
        >
          <button
            type="button"
            disabled={running}
            onClick={() => setMode("next")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "next"
                ? "bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            } ${running ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Next candidate
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() => setMode("database")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "database"
                ? "bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            } ${running ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Database IDs
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md text-center">
          <strong>Next candidate</strong> uses your{" "}
          <code className="text-[11px] bg-gray-200 dark:bg-gray-800 px-1 rounded">
            NEXT_PUBLIC_FETCH_URL
          </code>{" "}
          (e.g. …/next).{" "}
          <strong>Database IDs</strong> always picks the profile with the oldest{" "}
          <code className="text-[11px] bg-gray-200 dark:bg-gray-800 px-1 rounded">
            updatedAt
          </code>
          , scrapes{" "}
          <code className="text-[11px] bg-gray-200 dark:bg-gray-800 px-1 rounded">
            NEXT_PUBLIC_SITE_URL
          </code>
          + id, updates it, then queries again for the next stalest row (no new inserts).
        </p>
      </div>

      <div className="flex flex-row justify-center items-center gap-4 mb-8">
        {!running ? (
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
          >
            Start Scraping
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
          >
            Stop Scraping
          </button>
        )}
        <button
          onClick={handleClear}
          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
        >
          Clear Stats
        </button>
      </div>

      <div className="mb-6 text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
          running ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
        }`}>
          <div className={`w-3 h-3 rounded-full ${running ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="font-semibold">
            {running
              ? progress.mode === "database"
                ? "Scraping (database cycle)"
                : "Scraping (next candidate)"
              : "Scraping Stopped"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Elapsed Time</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatDuration(progress.elapsedMs)}
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Scraped</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {progress.scraped}
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">New Profiles Added</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {progress.added}
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Profiles Updated</div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {progress.updated}
          </div>
        </div>
      </div>

      {progress.lastUserId && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">Last Scraped Profile:</div>
          <div className="text-lg font-mono text-blue-700 dark:text-blue-300 break-all">
            {progress.lastUserId}
          </div>
        </div>
      )}
    </div>
  );
}
