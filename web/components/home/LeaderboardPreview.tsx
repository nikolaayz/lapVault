import { db } from "@/lib/db";
import { laps, cars, users, tracks } from "@/lib/db/schema";
import { eq, asc, desc, count } from "drizzle-orm";
import { formatMs } from "@/lib/formatters";
import Link from "next/link";

const medals = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPreview() {
  const [popular] = await db
    .select({ trackId: laps.trackId, cnt: count(laps.id) })
    .from(laps)
    .groupBy(laps.trackId)
    .orderBy(desc(count(laps.id)))
    .limit(1);

  if (!popular) return null;

  const [trackInfo] = await db
    .select({ name: tracks.name, country: tracks.country })
    .from(tracks)
    .where(eq(tracks.id, popular.trackId));

  const rows = await db
    .select({
      userId: laps.userId,
      userName: users.name,
      lapTimeMs: laps.lapTimeMs,
      carMake: cars.make,
      carModel: cars.model,
      carYear: cars.year,
    })
    .from(laps)
    .innerJoin(cars, eq(laps.carId, cars.id))
    .innerJoin(users, eq(laps.userId, users.id))
    .where(eq(laps.trackId, popular.trackId))
    .orderBy(asc(laps.lapTimeMs));

  const seen = new Map<number, typeof rows[0]>();
  for (const row of rows) {
    if (!seen.has(row.userId)) seen.set(row.userId, row);
  }
  const entries = Array.from(seen.values()).slice(0, 5);
  if (entries.length === 0) return null;

  return (
    <section className="bg-surface border-t border-card">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3 text-red">Live Rankings</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Who&apos;s fastest right now?</h2>
          <p className="text-sm text-muted">{trackInfo?.name} &mdash; {trackInfo?.country}</p>
        </div>

        <div className="rounded-xl border border-card overflow-hidden max-w-2xl mx-auto">
          <div className="flex items-center gap-4 px-5 py-2.5 bg-card border-b border-card">
            <p className="w-8 shrink-0 text-xs font-semibold uppercase tracking-widest text-muted">#</p>
            <p className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-widest text-muted">Driver</p>
            <p className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-widest text-muted hidden sm:block">Car</p>
            <p className="w-20 shrink-0 text-right text-xs font-semibold uppercase tracking-widest text-muted">Time</p>
          </div>
          {entries.map((entry, i) => (
            <div key={entry.userId} className="flex items-center gap-4 px-5 py-3.5 bg-surface border-b border-card/30 last:border-0">
              <p className="w-8 shrink-0 text-sm font-mono">
                {i < 3 ? medals[i] : <span className="text-muted">{i + 1}</span>}
              </p>
              <p className="flex-1 min-w-0 text-sm font-semibold text-off-white truncate">{entry.userName}</p>
              <p className="flex-1 min-w-0 text-xs text-muted truncate hidden sm:block">
                {entry.carYear} {entry.carMake} {entry.carModel}
              </p>
              <p className="w-20 shrink-0 font-mono font-bold text-sm text-off-white text-right">{formatMs(entry.lapTimeMs)}</p>
            </div>
          ))}
        </div>

        <p className="text-center mt-8">
          <Link href="/leaderboard" className="text-sm font-semibold text-red hover:underline">
            View full leaderboard →
          </Link>
        </p>
      </div>
    </section>
  );
}
