import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { laps, cars, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import type { CarClass } from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  const { searchParams } = new URL(req.url);
  const trackId = parseInt(searchParams.get("trackId") ?? "");
  const carClass = searchParams.get("class") as CarClass | null;
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "25"), 1), 200);
  const page = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
  const offset = (page - 1) * limit;

  if (isNaN(trackId)) return NextResponse.json({ error: "trackId is required" }, { status: 400 });

  const whereClause = carClass
    ? and(eq(laps.trackId, trackId), eq(cars.class, carClass))
    : eq(laps.trackId, trackId);

  const rows = await db
    .select({
      userId: laps.userId,
      userName: users.name,
      lapTimeMs: laps.lapTimeMs,
      conditions: laps.conditions,
      createdAt: laps.createdAt,
      carMake: cars.make,
      carModel: cars.model,
      carYear: cars.year,
      carClass: cars.class,
    })
    .from(laps)
    .innerJoin(cars, eq(laps.carId, cars.id))
    .innerJoin(users, eq(laps.userId, users.id))
    .where(whereClause)
    .orderBy(asc(laps.lapTimeMs));

  // Best lap per user; without class filter: one entry per (user, class)
  const seen = new Map<string, typeof rows[0]>();
  for (const row of rows) {
    const key = carClass ? String(row.userId) : `${row.userId}|${row.carClass}`;
    if (!seen.has(key)) seen.set(key, row);
  }

  const allEntries = Array.from(seen.values());
  const total = allEntries.length;
  const pageEntries = allEntries.slice(offset, offset + limit);

  return NextResponse.json({
    data: pageEntries.map((e, i) => ({
      rank: offset + i + 1,
      userId: e.userId,
      userName: e.userName,
      lapTimeMs: e.lapTimeMs,
      conditions: e.conditions,
      createdAt: e.createdAt.toISOString(),
      carMake: e.carMake,
      carModel: e.carModel,
      carYear: e.carYear,
      carClass: e.carClass,
      isCurrentUser: session ? e.userId === session.userId : false,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
