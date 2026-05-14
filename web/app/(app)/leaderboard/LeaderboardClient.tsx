"use client";

import { useEffect, useState } from "react";
import { formatMs, formatDate } from "@/lib/formatters";
import { CAR_CLASSES, classBadge } from "@/lib/types";
import type { CarClass } from "@/lib/types";

interface LeaderboardEntry {
  rank: number;
  userId: number;
  userName: string;
  lapTimeMs: number;
  carMake: string;
  carModel: string;
  carYear: number;
  carClass: string;
  conditions: string;
  createdAt: string;
  isCurrentUser: boolean;
}

interface Track {
  id: number;
  name: string;
  country: string;
  lengthKm: string | null;
}

const conditionsBadge: Record<string, string> = {
  dry: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  wet: "text-blue bg-blue/10 border-blue/20",
  damp: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

const medals = ["🥇", "🥈", "🥉"];

export default function LeaderboardClient({ tracks }: { tracks: Track[] }) {
  const [selectedTrackId, setSelectedTrackId] = useState(tracks[0]?.id.toString() ?? "");
  const [selectedClass, setSelectedClass] = useState<CarClass | "">("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedTrackId) return;
    setLoading(true);
    const params = new URLSearchParams({ trackId: selectedTrackId });
    if (selectedClass) params.set("class", selectedClass);
    fetch(`/api/leaderboard?${params}`)
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [selectedTrackId, selectedClass]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-red mb-1">Track Records</p>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
      </div>

      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-5xl mb-4">🏆</p>
          <p className="text-sm text-muted">No tracks available yet.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="bg-surface border border-card rounded-lg px-3 py-2 text-sm text-off-white focus:outline-none focus:border-red/50 w-full sm:w-72"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.country}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedClass("")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  selectedClass === ""
                    ? "text-red border-red bg-red/10"
                    : "text-muted border-card hover:border-off-white/30"
                }`}
              >
                All Classes
              </button>
              {CAR_CLASSES.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    selectedClass === cls ? classBadge[cls] : "text-muted border-card hover:border-off-white/30"
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 px-5 py-2.5 bg-card border-b border-card">
              <p className="w-8 shrink-0 text-xs font-semibold uppercase tracking-widest text-muted">#</p>
              <p className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-widest text-muted">Driver</p>
              <p className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-widest text-muted hidden sm:block">Car</p>
              <p className="w-20 shrink-0 text-xs font-semibold uppercase tracking-widest text-muted">Time</p>
              <p className="w-16 shrink-0 text-xs font-semibold uppercase tracking-widest text-muted hidden sm:block">Cond.</p>
              <p className="w-24 shrink-0 text-xs font-semibold uppercase tracking-widest text-muted hidden md:block">Date</p>
            </div>

            {loading ? (
              <div className="py-16 flex items-center justify-center bg-surface">
                <p className="text-sm text-muted">Loading…</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 bg-surface">
                <p className="text-3xl">⏱</p>
                <p className="text-sm text-muted">No laps recorded for this track yet.</p>
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={`${entry.userId}-${entry.carClass}`}
                  className={`flex items-center gap-4 px-5 py-3.5 bg-surface hover:bg-card/40 transition-colors border-b border-card/30 last:border-0 ${
                    entry.isCurrentUser ? "border-l-[3px] border-l-red" : "border-l-[3px] border-l-transparent"
                  }`}
                >
                  <p className="w-8 shrink-0 text-sm font-mono">
                    {entry.rank <= 3 ? medals[entry.rank - 1] : <span className="text-muted">{entry.rank}</span>}
                  </p>
                  <p className={`flex-1 min-w-0 text-sm font-semibold truncate ${entry.isCurrentUser ? "text-red" : "text-off-white"}`}>
                    {entry.userName}{entry.isCurrentUser ? " (you)" : ""}
                  </p>
                  <div className="flex-1 min-w-0 hidden sm:flex items-center gap-2">
                    <p className="text-sm text-off-white truncate">
                      {entry.carYear} {entry.carMake} {entry.carModel}
                    </p>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border shrink-0 hidden lg:inline ${classBadge[entry.carClass as CarClass] ?? "text-muted border-card"}`}>
                      {entry.carClass}
                    </span>
                  </div>
                  <p className="w-20 shrink-0 font-mono font-bold text-sm text-off-white">{formatMs(entry.lapTimeMs)}</p>
                  <span className={`w-16 shrink-0 hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${conditionsBadge[entry.conditions] ?? "text-muted border-card"}`}>
                    {entry.conditions}
                  </span>
                  <p className="w-24 shrink-0 hidden md:block text-xs text-muted">{formatDate(entry.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
