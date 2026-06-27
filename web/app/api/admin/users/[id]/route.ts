export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  if (id === session.userId) return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });

  const { role } = await req.json();
  if (role !== "user" && role !== "admin") return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  await db.update(users).set({ role }).where(eq(users.id, id));

  return NextResponse.json({ ok: true });
}
