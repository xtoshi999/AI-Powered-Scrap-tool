"use client";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useCallback, useEffect, useState } from "react";

const Navbar = () => {
  const { isAuthenticated, user, setToken, setUser, token } = useAuth();
  const router = useRouter();
  const [markStats, setMarkStats] = useState({
    visited: 0,
    sent: 0,
    good: 0,
    bad: 0,
    dayKey: "",
  });

  const fetchMarkStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/profiles/mark-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        visited?: number;
        sent?: number;
        good?: number;
        bad?: number;
        dayKey?: string;
      };
      setMarkStats({
        visited: data.visited ?? 0,
        sent: data.sent ?? 0,
        good: data.good ?? 0,
        bad: data.bad ?? 0,
        dayKey: data.dayKey ?? "",
      });
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    void fetchMarkStats();
  }, [isAuthenticated, token, fetchMarkStats]);

  useEffect(() => {
    const onRefresh = () => void fetchMarkStats();
    window.addEventListener("daily-mark-stats-refresh", onRefresh);
    return () => window.removeEventListener("daily-mark-stats-refresh", onRefresh);
  }, [fetchMarkStats]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Logged out successfully", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout error occurred", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setToken(null);
      setUser(null);
      router.push("/login");
    }
  };
  return (
    <nav className="w-full bg-gray-800 p-2">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-white text-xl font-bold">
          <Link href="/">
            <Image
              src="/cutestar.png"
              alt="Logo"
              width={100}
              height={100}
              className="h-10 w-10 rounded-full"
            />
          </Link>
        </div>
        
        <div className="flex space-x-8 items-center">
          {isAuthenticated ? (
            <>
              <Link href="/">
                <button className="text-white hover:text-gray-300">
                  Dashboard
                </button>
              </Link>
              <Link href="/about">
                <button className="text-white hover:text-gray-300">About</button>
              </Link>
              <div
                className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs text-gray-300 border border-gray-600 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 max-w-[min(100%,28rem)]"
                title={`Marks today (UTC ${markStats.dayKey || "—"}). Counts reset at UTC midnight.`}
              >
                <span>
                  Visited:{" "}
                  <strong className="text-blue-300 tabular-nums">{markStats.visited}</strong>
                </span>
                <span>
                  Sent:{" "}
                  <strong className="text-purple-300 tabular-nums">{markStats.sent}</strong>
                </span>
                <span>
                  Good:{" "}
                  <strong className="text-green-300 tabular-nums">{markStats.good}</strong>
                </span>
                <span>
                  Bad:{" "}
                  <strong className="text-red-300 tabular-nums">{markStats.bad}</strong>
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-white text-sm">
                  Welcome, {user?.name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login">
                <button className="text-white hover:text-gray-300">
                  Login
                </button>
              </Link>
              <Link href="/register">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">
                  Register
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
