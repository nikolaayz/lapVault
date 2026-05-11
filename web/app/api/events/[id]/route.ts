import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { trackId, title, date, maxParticipants, allowedClasses, description } = await req.json();

  if (!trackId || !title?.trim() || !date) {
    return NextResponse.json({ error: "trackId, title, and date are required" }, { status: 400 });
  }

  const eventDate = new Date(date);
  if (isNaN(eventDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const [existing] = await db.select({ createdBy: events.createdBy }).from(events).where(eq(events.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (existing.createdBy !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [updated] = await db
    .update(events)
    .set({
      trackId,
      title: title.trim(),
      date: eventDate,
      maxParticipants: maxParticipants ?? null,
      allowedClasses: allowedClasses?.length ? allowedClasses : null,
      description: description?.trim() || null,
    })
    .where(eq(events.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [existing] = await db.select({ createdBy: events.createdBy }).from(events).where(eq(events.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (existing.createdBy !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(events).where(eq(events.id, id));
  return NextResponse.json({ ok: true });
}
