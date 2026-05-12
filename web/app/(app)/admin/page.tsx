import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { users, tracks, events, eventRegistrations, laps, cars } from "@/lib/db/schema";
import { eq, count, asc, desc } from "drizzle-orm";
import AdminClient, { type AdminUser, type AdminTrack, type AdminRegistration, type AdminStats } from "./AdminClient";

async function getAdminData() {
  const [userRows, trackRows, regRows, [evtCount], [lapCount], [pendingCount]] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .orderBy(asc(users.createdAt)),

    db
      .select({
        id: tracks.id,
        name: tracks.name,
        country: tracks.country,
        lengthKm: tracks.lengthKm,
        description: tracks.description,
        photoUrl: tracks.photoUrl,
        createdAt: tracks.createdAt,
      })
      .from(tracks)
      .orderBy(asc(tracks.name)),

    db
      .select({
        id: eventRegistrations.id,
        status: eventRegistrations.status,
        createdAt: eventRegistrations.createdAt,
        userName: users.name,
        userEmail: users.email,
        eventId: events.id,
        eventTitle: events.title,
        eventDate: events.date,
        trackName: tracks.name,
        carMake: cars.make,
        carModel: cars.model,
        carYear: cars.year,
        carClass: cars.class,
      })
      .from(eventRegistrations)
      .innerJoin(users, eq(eventRegistrations.userId, users.id))
      .innerJoin(events, eq(eventRegistrations.eventId, events.id))
      .innerJoin(tracks, eq(events.trackId, tracks.id))
      .innerJoin(cars, eq(eventRegistrations.carId, cars.id))
      .orderBy(desc(eventRegistrations.createdAt)),

    db.select({ total: count(events.id) }).from(events),
    db.select({ total: count(laps.id) }).from(laps),
    db
      .select({ total: count(eventRegistrations.id) })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.status, "pending")),
  ]);

  const adminUsers: AdminUser[] = userRows.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  const adminTracks: AdminTrack[] = trackRows.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  const adminRegs: AdminRegistration[] = regRows.map((r) => ({
    ...r,
    status: r.status as "pending" | "confirmed" | "cancelled",
    createdAt: r.createdAt.toISOString(),
    eventDate: r.eventDate.toISOString(),
  }));

  const stats: AdminStats = {
    userCount: userRows.length,
    eventCount: Number(evtCount?.total ?? 0),
    lapCount: Number(lapCount?.total ?? 0),
    pendingCount: Number(pendingCount?.total ?? 0),
  };

  return { adminUsers, adminTracks, adminRegs, stats };
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let session: { userId: number; role: "user" | "admin" } | null = null;
  try {
    session = await verifyToken(token);
  } catch {
    redirect("/login");
  }

  if (!session || session.role !== "admin") redirect("/dashboard");

  const { adminUsers, adminTracks, adminRegs, stats } = await getAdminData();

  return (
    <AdminClient
      currentUserId={session.userId}
      initialUsers={adminUsers}
      initialTracks={adminTracks}
      initialRegistrations={adminRegs}
      stats={stats}
    />
  );
}
