import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, laps, cars, tracks, events, eventRegistrations } from "@/lib/db/schema";
import { eq, count, min, desc, and, isNotNull, gte, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

function formatMs(ms: number): string {
  const m = Math.floor(ms / 60_000);
  const sec = ((ms % 60_000) / 1000).toFixed(3);
  return m > 0 ? `${m}:${sec.padStart(6, "0")}` : sec;
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { userId } = session;

  const [userRows, totalRows, latestLapRows, recentLapRows, upcomingEventRows] = await Promise.all([
    db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1),
    db.select({ total: count(laps.id) }).from(laps).where(eq(laps.userId, userId)),
    db
      .select({ trackId: laps.trackId, trackName: tracks.name })
      .from(laps)
      .innerJoin(tracks, eq(laps.trackId, tracks.id))
      .where(eq(laps.userId, userId))
      .orderBy(desc(laps.createdAt))
      .limit(1),
    db
      .select({
        id: laps.id,
        lapTimeMs: laps.lapTimeMs,
        conditions: laps.conditions,
        createdAt: laps.createdAt,
        trackName: tracks.name,
        carMake: cars.make,
        carModel: cars.model,
        carYear: cars.year,
      })
      .from(laps)
      .innerJoin(tracks, eq(laps.trackId, tracks.id))
      .innerJoin(cars, eq(laps.carId, cars.id))
      .where(eq(laps.userId, userId))
      .orderBy(desc(laps.createdAt))
      .limit(5),
    db
      .select({ id: events.id, title: events.title, date: events.date, trackName: tracks.name })
      .from(events)
      .innerJoin(eventRegistrations, eq(eventRegistrations.eventId, events.id))
      .innerJoin(tracks, eq(events.trackId, tracks.id))
      .where(and(eq(eventRegistrations.userId, userId), gte(events.date, new Date())))
      .orderBy(asc(events.date))
      .limit(3),
  ]);

  let trackName: string | null = null;
  let bestLapMs: number | null = null;
  let bestLapFormatted: string | null = null;
  let possibleBestMs: number | null = null;
  let possibleBestFormatted: string | null = null;

  if (latestLapRows[0]) {
    const { trackId, trackName: name } = latestLapRows[0];
    trackName = name;

    const [bestRows, sectorRows] = await Promise.all([
      db
        .select({ bestMs: min(laps.lapTimeMs) })
        .from(laps)
        .where(and(eq(laps.userId, userId), eq(laps.trackId, trackId))),
      db
        .select({ s1: min(laps.sector1Ms), s2: min(laps.sector2Ms), s3: min(laps.sector3Ms) })
        .from(laps)
        .where(and(
          eq(laps.userId, userId),
          eq(laps.trackId, trackId),
          isNotNull(laps.sector1Ms),
          isNotNull(laps.sector2Ms),
          isNotNull(laps.sector3Ms),
        )),
    ]);

    bestLapMs = bestRows[0]?.bestMs ?? null;
    if (bestLapMs != null) bestLapFormatted = formatMs(bestLapMs);

    const s = sectorRows[0];
    if (s?.s1 != null && s?.s2 != null && s?.s3 != null) {
      possibleBestMs = s.s1 + s.s2 + s.s3;
      possibleBestFormatted = formatMs(possibleBestMs);
    }
  }

  return NextResponse.json({
    userName: userRows[0]?.name ?? "Driver",
    totalLaps: totalRows[0]?.total ?? 0,
    trackName,
    bestLapMs,
    bestLapFormatted,
    possibleBestMs,
    possibleBestFormatted,
    recentLaps: recentLapRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    upcomingEvents: upcomingEventRows.map((r) => ({ ...r, date: r.date.toISOString() })),
  });
}