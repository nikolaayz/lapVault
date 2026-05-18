import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, tracks, users, eventRegistrations } from "@/lib/db/schema";
import { eq, count, asc } from "drizzle-orm";
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

  const eventsQuery = db
    .select({
      id: events.id,
      title: events.title,
      date: events.date,
      maxParticipants: events.maxParticipants,
      allowedClasses: events.allowedClasses,
      description: events.description,
      createdAt: events.createdAt,
      creatorId: events.createdBy,
      creatorName: users.name,
      trackId: tracks.id,
      trackName: tracks.name,
      trackCountry: tracks.country,
      trackLengthKm: tracks.lengthKm,
    })
    .from(events)
    .innerJoin(tracks, eq(events.trackId, tracks.id))
    .innerJoin(users, eq(events.createdBy, users.id))
    .orderBy(asc(events.date));

  const [rows, regCounts, userRegs] = await Promise.all([
    paginate ? eventsQuery.limit(limit).offset(offset) : eventsQuery,
    db
      .select({ eventId: eventRegistrations.eventId, total: count(eventRegistrations.id) })
      .from(eventRegistrations)
      .groupBy(eventRegistrations.eventId),
    db
      .select({ eventId: eventRegistrations.eventId, carId: eventRegistrations.carId, status: eventRegistrations.status })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userId, session.userId)),
  ]);

  const countMap = new Map(regCounts.map((r) => [r.eventId, Number(r.total)]));
  const regMap = new Map(userRegs.map((r) => [r.eventId, { carId: r.carId, status: r.status }]));

  const mapped = rows.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date.toISOString(),
    maxParticipants: r.maxParticipants,
    allowedClasses: r.allowedClasses,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    isCreator: r.creatorId === session.userId,
    creatorName: r.creatorName,
    track: { id: r.trackId, name: r.trackName, country: r.trackCountry, lengthKm: r.trackLengthKm },
    registrationCount: countMap.get(r.id) ?? 0,
    myRegistration: regMap.has(r.id) ? regMap.get(r.id)! : null,
  }));

  if (!paginate) return NextResponse.json(mapped);

  const [{ total }] = await db.select({ total: count() }).from(events);

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

  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { trackId, title, date, maxParticipants, allowedClasses, description } = await req.json();

  if (!trackId || !title?.trim() || !date) {
    return NextResponse.json({ error: "trackId, title, and date are required" }, { status: 400 });
  }

  const eventDate = new Date(date);
  if (isNaN(eventDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const [event] = await db
    .insert(events)
    .values({
      trackId,
      title: title.trim(),
      date: eventDate,
      createdBy: session.userId,
      maxParticipants: maxParticipants ?? null,
      allowedClasses: allowedClasses?.length ? allowedClasses : null,
      description: description?.trim() || null,
    })
    .returning();

  return NextResponse.json(event, { status: 201 });
}
