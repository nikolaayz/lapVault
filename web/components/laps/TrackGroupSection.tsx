import { formatMs } from "@/lib/formatters";
import { LapRow } from "@/components/laps/LapRow";
import { TrackIcon } from "@/components/ui/TrackIcon";
import type { Lap, LapGroup } from "@/lib/lapUtils";

export function TrackGroupSection({
  group,
  onEdit,
  onDelete,
  deletingId,
}: {
  group: LapGroup;
  onEdit: (lap: Lap) => void;
  onDelete: (id: number) => void;
  deletingId: number | null;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-card">
      <div className="bg-card px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <TrackIcon name={group.track.name} size={56} />
          <div className="min-w-0">
            <p className="font-bold text-base leading-tight truncate">{group.track.name}</p>
            <p className="text-xs text-muted mt-0.5">
              {group.track.country}
              {group.track.lengthKm ? ` · ${group.track.lengthKm} km` : ""}
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-off-white/5 text-muted border border-card shrink-0">
            {group.laps.length} {group.laps.length === 1 ? "lap" : "laps"}
          </span>
        </div>
        <div className="flex gap-6 shrink-0">
          <div className="text-right">
            <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Best</p>
            <p className="text-lg font-bold text-red font-mono">{formatMs(group.bestMs)}</p>
          </div>
          {group.possibleBestMs != null && (
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Possible Best</p>
              <p className="text-lg font-bold text-blue font-mono">{formatMs(group.possibleBestMs)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="divide-y divide-card">
        {group.laps.map((lap) => (
          <LapRow
            key={lap.id}
            lap={lap}
            isBest={lap.lapTimeMs === group.bestMs}
            onEdit={() => onEdit(lap)}
            onDelete={() => onDelete(lap.id)}
            deleting={deletingId === lap.id}
          />
        ))}
      </div>
    </div>
  );
}
