export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { laps, cars, tracks } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get("page");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "25"), 1), 200);
  const page = Math.max(parseInt(pageParam ?? "1"), 1);
  const offset = (page - 1) * limit;
  const paginate = pageParam !== null;

  const selectFields = {
    id: laps.id,
    lapTimeMs: laps.lapTimeMs,
    sector1Ms: laps.sector1Ms,
    sector2Ms: laps.sector2Ms,
    sector3Ms: laps.sector3Ms,
    conditions: laps.conditions,
    notes: laps.notes,
    createdAt: laps.createdAt,
    carId: cars.id,
    carMake: cars.make,
    carModel: cars.model,
    carYear: cars.year,
    carClass: cars.class,
    trackId: tracks.id,
    trackName: tracks.name,
    trackCountry: tracks.country,
    trackLengthKm: tracks.lengthKm,
  };

  const baseQuery = db
    .select(selectFields)
    .from(laps)
    .innerJoin(cars, eq(laps.carId, cars.id))
    .innerJoin(tracks, eq(laps.trackId, tracks.id))
    .where(eq(laps.userId, session.userId))
    .orderBy(desc(laps.createdAt));

  const rows = paginate
    ? await baseQuery.limit(limit).offset(offset)
    : await baseQuery;

  const mapped = rows.map((r) => ({
    id: r.id,
    lapTimeMs: r.lapTimeMs,
    sector1Ms: r.sector1Ms,
    sector2Ms: r.sector2Ms,
    sector3Ms: r.sector3Ms,
    conditions: r.conditions,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    car: { id: r.carId, make: r.carMake, model: r.carModel, year: r.carYear, class: r.carClass },
    track: { id: r.trackId, name: r.trackName, country: r.trackCountry, lengthKm: r.trackLengthKm },
  }));

  if (!paginate) return NextResponse.json(mapped);

  const [{ total }] = await db
    .select({ total: count() })
    .from(laps)
    .where(eq(laps.userId, session.userId));

  return NextResponse.json({
    data: mapped,
    total: Number(total),
    page,
    limit,
    totalPages: Math.ceil(Number(total) / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { carId, trackId, lapTimeMs, sector1Ms, sector2Ms, sector3Ms, conditions, notes } = await req.json();

  if (!carId || !trackId || !lapTimeMs || !conditions) {
    return NextResponse.json({ error: "carId, trackId, lapTimeMs, and conditions are required" }, { status: 400 });
  }

  if (typeof lapTimeMs !== "number" || lapTimeMs <= 0) {
    return NextResponse.json({ error: "Invalid lap time" }, { status: 400 });
  }

  const [lap] = await db
    .insert(laps)
    .values({
      userId: session.userId,
      carId,
      trackId,
      lapTimeMs,
      sector1Ms: sector1Ms ?? null,
      sector2Ms: sector2Ms ?? null,
      sector3Ms: sector3Ms ?? null,
      conditions,
      notes: notes?.trim() || null,
    })
    .returning();

  return NextResponse.json(lap, { status: 201 });
}