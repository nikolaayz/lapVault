import { formatDate, formatMs } from "@/lib/formatters";
import { EditIcon, TrashIcon } from "@/components/ui/icons";
import { classBadge } from "@/lib/types";
import type { Lap, Conditions } from "@/lib/lapUtils";

const conditionsBadge: Record<Conditions, string> = {
  dry: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  wet: "text-blue bg-blue/10 border-blue/20",
  damp: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

export function LapRow({
  lap,
  isBest,
  onEdit,
  onDelete,
  deleting,
}: {
  lap: Lap;
  isBest: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-3.5 bg-surface hover:bg-card/40 transition-colors ${
        isBest ? "border-l-[3px] border-red" : "border-l-[3px] border-transparent"
      }`}
    >
      <p className={`font-mono font-bold text-sm w-20 shrink-0 ${isBest ? "text-red" : "text-off-white"}`}>
        {formatMs(lap.lapTimeMs)}
      </p>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <p className="text-sm truncate text-off-white">
          {lap.car.year} {lap.car.make} {lap.car.model}
        </p>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border shrink-0 ${classBadge[lap.car.class]}`}>
          {lap.car.class}
        </span>
      </div>

      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 capitalize ${conditionsBadge[lap.conditions]}`}
      >
        {lap.conditions}
      </span>

      {(lap.sector1Ms != null || lap.sector2Ms != null || lap.sector3Ms != null) && (
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          {([lap.sector1Ms, lap.sector2Ms, lap.sector3Ms] as (number | null)[]).map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-xs text-muted uppercase tracking-widest leading-none mb-0.5">S{i + 1}</p>
              <p className="text-xs font-mono text-muted">{s != null ? formatMs(s) : "—"}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted shrink-0 hidden sm:block">{formatDate(lap.createdAt)}</p>

      <div className="flex gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="text-muted hover:text-off-white transition-colors p-1.5 rounded hover:bg-off-white/5"
          title="Edit lap"
        >
          <EditIcon />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="text-muted hover:text-red transition-colors p-1.5 rounded hover:bg-red/5 disabled:opacity-40"
          title="Delete lap"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
