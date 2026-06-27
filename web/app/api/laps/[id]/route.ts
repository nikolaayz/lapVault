export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { laps } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { carId, trackId, lapTimeMs, sector1Ms, sector2Ms, sector3Ms, conditions, notes } = await req.json();

  if (!carId || !trackId || !lapTimeMs || !conditions) {
    return NextResponse.json({ error: "carId, trackId, lapTimeMs, and conditions are required" }, { status: 400 });
  }

  const [updated] = await db
    .update(laps)
    .set({ carId, trackId, lapTimeMs, sector1Ms: sector1Ms ?? null, sector2Ms: sector2Ms ?? null, sector3Ms: sector3Ms ?? null, conditions, notes: notes?.trim() || null })
    .where(and(eq(laps.id, id), eq(laps.userId, session.userId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Lap not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [deleted] = await db
    .delete(laps)
    .where(and(eq(laps.id, id), eq(laps.userId, session.userId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Lap not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}