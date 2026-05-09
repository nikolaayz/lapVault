import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { users, laps, cars, tracks } from "@/lib/db/schema";
import { eq, count, min, desc, and, isNotNull } from "drizzle-orm";
import Link from "next/link";

function formatMs(ms: number): string {
  const m = Math.floor(ms / 60_000);
  const sec = ((ms % 60_000) / 1000).toFixed(3);
  return m > 0 ? `${m}:${sec}` : sec;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function getDashboardData(userId: number) {
  const [userRows, totalRows, latestLapRows, recentLapRows] = await Promise.all([
    db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1),
    db.select({ total: count(laps.id) }).from(laps).where(eq(laps.userId, userId)),
    db
      .select({ trackId: laps.trackId, trackName: tracks.name })
      .from(laps)
      .innerJoin(tracks, eq(laps.trackId, tracks.id))
      .where(eq(laps.userId, userId))
      .orderBy(desc(laps.createdAt))
      .limit(1),
    db
      .select({
        id: laps.id,
        lapTimeMs: laps.lapTimeMs,
        conditions: laps.conditions,
        createdAt: laps.createdAt,
        trackName: tracks.name,
        carMake: cars.make,
        carModel: cars.model,
        carYear: cars.year,
      })
      .from(laps)
      .innerJoin(tracks, eq(laps.trackId, tracks.id))
      .innerJoin(cars, eq(laps.carId, cars.id))
      .where(eq(laps.userId, userId))
      .orderBy(desc(laps.createdAt))
      .limit(5),
  ]);

  let trackName: string | null = null;
  let bestLapMs: number | null = null;
  let possibleBestMs: number | null = null;

  if (latestLapRows[0]) {
    const { trackId, trackName: name } = latestLapRows[0];
    trackName = name;

    const [bestRows, sectorRows] = await Promise.all([
      db
        .select({ bestMs: min(laps.lapTimeMs) })
        .from(laps)
        .where(and(eq(laps.userId, userId), eq(laps.trackId, trackId))),
      db
        .select({ s1: min(laps.sector1Ms), s2: min(laps.sector2Ms), s3: min(laps.sector3Ms) })
        .from(laps)
        .where(and(
          eq(laps.userId, userId),
          eq(laps.trackId, trackId),
          isNotNull(laps.sector1Ms),
          isNotNull(laps.sector2Ms),
          isNotNull(laps.sector3Ms),
        )),
    ]);

    bestLapMs = bestRows[0]?.bestMs ?? null;
    const s = sectorRows[0];
    if (s?.s1 != null && s?.s2 != null && s?.s3 != null) {
      possibleBestMs = s.s1 + s.s2 + s.s3;
    }
  }

  return {
    userName: userRows[0]?.name ?? "Driver",
    totalLaps: totalRows[0]?.total ?? 0,
    trackName,
    bestLapMs,
    possibleBestMs,
    recentLaps: recentLapRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let userName = "Driver";
  let totalLaps = 0;
  let trackName: string | null = null;
  let bestLapMs: number | null = null;
  let possibleBestMs: number | null = null;
  let recentLaps: { id: number; lapTimeMs: number; conditions: string; createdAt: string; trackName: string; carMake: string; carModel: string; carYear: number }[] = [];

  if (token) {
    try {
      const { userId } = await verifyToken(token);
      ({ userName, totalLaps, trackName, bestLapMs, possibleBestMs, recentLaps } = await getDashboardData(userId));
    } catch {
      // layout handles redirect
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-red mb-1">Dashboard</p>
        <h1 className="text-3xl font-bold">Welcome back, {userName}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-6 border-l-[3px] border-red">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Total Laps</p>
          <p className="text-3xl font-bold font-mono">{totalLaps > 0 ? totalLaps : "—"}</p>
        </div>

        <div className="bg-card rounded-lg p-6 border-l-[3px] border-red">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Best Lap</p>
          <p className="text-3xl font-bold font-mono">{bestLapMs != null ? formatMs(bestLapMs) : "—"}</p>
          {trackName && (
            <p className="text-xs text-muted mt-1.5 truncate">{trackName}</p>
          )}
        </div>

        <div className="bg-card rounded-lg p-6 border-l-[3px] border-blue">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Possible Best</p>
          <p className="text-3xl font-bold font-mono">{possibleBestMs != null ? formatMs(possibleBestMs) : "—"}</p>
          {trackName && possibleBestMs != null && (
            <p className="text-xs text-muted mt-1.5 truncate">{trackName}</p>
          )}
          {possibleBestMs == null && totalLaps > 0 && (
            <p className="text-xs text-muted mt-1.5">Log laps with all 3 sectors</p>
          )}
        </div>
      </div>

      {/* Recent laps + upcoming events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Recent Laps</p>
            {totalLaps > 0 && (
              <Link href="/laps" className="text-xs text-red hover:underline">View all →</Link>
            )}
          </div>

          {recentLaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-4xl mb-3">⏱</p>
              <p className="text-sm text-muted">No laps logged yet.</p>
              <p className="text-xs text-muted mt-1">Head to the track and log your first lap.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-card">
              {recentLaps.map((lap) => (
                <div key={lap.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{lap.trackName}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {lap.carYear} {lap.carMake} {lap.carModel} · {formatDate(lap.createdAt)}
                    </p>
                  </div>
                  <p className="font-mono font-bold text-sm text-off-white shrink-0 ml-4">{formatMs(lap.lapTimeMs)}</p>
                </div>
              ))}
            </div>
          )}
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
