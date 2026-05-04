import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const { userId } = await verifyToken(token);
    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-red mb-1">Dashboard</p>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name ?? "Driver"}</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Laps", value: "—", accent: "border-red" },
          { label: "Best Lap", value: "—", accent: "border-red" },
          { label: "Possible Best", value: "—", accent: "border-blue" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-card rounded-lg p-6 border-l-[3px] ${stat.accent}`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent laps + Upcoming events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Recent Laps</p>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-4xl mb-3">⏱</p>
            <p className="text-sm text-muted">No laps logged yet.</p>
            <p className="text-xs text-muted mt-1">Head to the track and log your first lap.</p>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Upcoming Events</p>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-sm text-muted">No upcoming events.</p>
            <p className="text-xs text-muted mt-1">Check back soon for new track days.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
