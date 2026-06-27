export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventRegistrations, cars } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: rawId } = await params;
  const eventId = parseInt(rawId);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { carId } = await req.json();
  if (!carId) return NextResponse.json({ error: "carId is required" }, { status: 400 });

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const [car] = await db
    .select({ id: cars.id, class: cars.class, ownerId: cars.ownerId })
    .from(cars)
    .where(eq(cars.id, carId))
    .limit(1);
  if (!car || car.ownerId !== session.userId) return NextResponse.json({ error: "Car not found" }, { status: 404 });

  if (event.allowedClasses?.length && !event.allowedClasses.includes(car.class)) {
    return NextResponse.json({ error: "Your car class is not allowed for this event" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: eventRegistrations.id })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, session.userId)))
    .limit(1);
  if (existing) return NextResponse.json({ error: "Already registered" }, { status: 409 });

  if (event.maxParticipants) {
    const [{ total }] = await db
      .select({ total: count(eventRegistrations.id) })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId));
    if (Number(total) >= event.maxParticipants) {
      return NextResponse.json({ error: "Event is full" }, { status: 409 });
    }
  }

  const [reg] = await db
    .insert(eventRegistrations)
    .values({ eventId, userId: session.userId, carId, status: "confirmed" })
    .returning();

  return NextResponse.json(reg, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: rawId } = await params;
  const eventId = parseInt(rawId);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [existing] = await db
    .select({ id: eventRegistrations.id })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, session.userId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not registered" }, { status: 404 });

  await db.delete(eventRegistrations).where(eq(eventRegistrations.id, existing.id));
  return NextResponse.json({ ok: true });
}
