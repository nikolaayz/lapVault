import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cars } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { make, model, year, powerHp, weightKg, class: carClass, modifications, photoUrl } = await req.json();

  const [updated] = await db
    .update(cars)
    .set({ make, model, year, class: carClass, powerHp, weightKg, modifications, photoUrl })
    .where(and(eq(cars.id, id), eq(cars.ownerId, session.userId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Car not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [deleted] = await db
    .delete(cars)
    .where(and(eq(cars.id, id), eq(cars.ownerId, session.userId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Car not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}