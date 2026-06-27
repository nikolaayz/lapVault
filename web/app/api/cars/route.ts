export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cars } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userCars = await db.select().from(cars).where(eq(cars.ownerId, session.userId));
  return NextResponse.json(userCars);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { make, model, year, powerHp, weightKg, class: carClass, modifications, photoUrl } = await req.json();

  if (!make || !model || !year || !carClass) {
    return NextResponse.json({ error: "make, model, year, and class are required" }, { status: 400 });
  }

  const [car] = await db.insert(cars).values({
    ownerId: session.userId,
    make,
    model,
    year,
    class: carClass,
    powerHp: powerHp ?? null,
    weightKg: weightKg ?? null,
    modifications: modifications ?? null,
    photoUrl: photoUrl ?? null,
  }).returning();

  return NextResponse.json(car, { status: 201 });
}