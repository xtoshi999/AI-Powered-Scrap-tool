import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getTodayStatsForUser } from "@/lib/dailyMarkStats";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
  }

  const token = authHeader.substring(7);
  let userId: string;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    userId = String(decoded.userId);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const stats = await getTodayStatsForUser(userId);
  return NextResponse.json(stats);
}
