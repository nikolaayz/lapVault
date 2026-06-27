export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allTracks = await db.select().from(tracks).orderBy(asc(tracks.name));
  return NextResponse.json(allTracks.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })));
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, country, lengthKm, description, photoUrl } = await req.json();

  if (!name?.trim() || !country?.trim()) {
    return NextResponse.json({ error: "Name and country are required" }, { status: 400 });
  }

  const [track] = await db
    .insert(tracks)
    .values({
      name: name.trim(),
      country: country.trim(),
      lengthKm: lengthKm?.trim() || null,
      description: description?.trim() || null,
      photoUrl: photoUrl?.trim() || null,
    })
    .returning();

  return NextResponse.json({ ...track, createdAt: track.createdAt.toISOString() }, { status: 201 });
}
