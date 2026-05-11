import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { name, email } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const emailLower = email.trim().toLowerCase();

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, emailLower), ne(users.id, session.userId)))
    .limit(1);

  if (taken) return NextResponse.json({ error: "Email is already in use" }, { status: 409 });

  const [updated] = await db
    .update(users)
    .set({ name: name.trim(), email: emailLower })
    .where(eq(users.id, session.userId))
    .returning({ name: users.name, email: users.email });

  return NextResponse.json(updated);
}
