import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { name, country, lengthKm, description, photoUrl } = await req.json();

  if (!name?.trim() || !country?.trim()) {
    return NextResponse.json({ error: "Name and country are required" }, { status: 400 });
  }

  await db
    .update(tracks)
    .set({
      name: name.trim(),
      country: country.trim(),
      lengthKm: lengthKm?.trim() || null,
      description: description?.trim() || null,
      photoUrl: photoUrl?.trim() || null,
    })
    .where(eq(tracks.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await db.delete(tracks).where(eq(tracks.id, id));

  return NextResponse.json({ ok: true });
}
