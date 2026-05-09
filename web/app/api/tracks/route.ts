import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const allTracks = await db
    .select({ id: tracks.id, name: tracks.name, country: tracks.country, lengthKm: tracks.lengthKm })
    .from(tracks)
    .orderBy(asc(tracks.name));

  return NextResponse.json(allTracks);
}