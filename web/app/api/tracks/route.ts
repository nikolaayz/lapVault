import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { asc, count } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get("page");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50"), 1), 200);
  const page = Math.max(parseInt(pageParam ?? "1"), 1);
  const offset = (page - 1) * limit;
  const paginate = pageParam !== null;

  const baseQuery = db
    .select({ id: tracks.id, name: tracks.name, country: tracks.country, lengthKm: tracks.lengthKm })
    .from(tracks)
    .orderBy(asc(tracks.name));

  const rows = paginate ? await baseQuery.limit(limit).offset(offset) : await baseQuery;

  if (!paginate) return NextResponse.json(rows);

  const [{ total }] = await db.select({ total: count() }).from(tracks);

  return NextResponse.json({
    data: rows,
    total: Number(total),
    page,
    limit,
    totalPages: Math.ceil(Number(total) / limit),
  });
}