import { classBadge } from "@/lib/types";
import { getDateParts, formatDate, formatTime } from "@/lib/eventUtils";
import type { Event, EventCar, RegistrationStatus } from "@/lib/eventUtils";

const statusBadge: Record<RegistrationStatus, string> = {
  pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  confirmed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  cancelled: "text-muted bg-muted/10 border-muted/20",
};

const statusLabel: Record<RegistrationStatus, string> = {
  pending: "Registered",
  confirmed: "Registered",
  cancelled: "Cancelled",
};

export function EventCard({
  event,
  cars,
  isPast,
  onEdit,
  onDelete,
  onRegister,
  onCancelRegistration,
  deleting,
  cancelling,
}: {
  event: Event;
  cars: EventCar[];
  isPast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRegister: () => void;
  onCancelRegistration: () => void;
  deleting: boolean;
  cancelling: boolean;
}) {
  const { day, month, year } = getDateParts(event.date);
  const isFull = event.maxParticipants != null && event.registrationCount >= event.maxParticipants;
  const hasCompatibleCar = event.allowedClasses?.length
    ? cars.some((c) => event.allowedClasses!.includes(c.class))
    : cars.length > 0;

  return (
    <div className={`rounded-xl border border-card overflow-hidden ${isPast ? "opacity-60" : ""}`}>
      <div className="bg-card p-5 flex items-start gap-5">
        <div className="flex flex-col items-center justify-center bg-carbon rounded-lg px-4 py-3 shrink-0 w-16 text-center">
          <p className="text-xs font-bold text-red tracking-widest">{month}</p>
          <p className="text-2xl font-bold text-off-white leading-tight">{day}</p>
          <p className="text-xs text-muted">{year}</p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-bold text-base leading-tight">{event.title}</p>
              <p className="text-sm text-muted mt-0.5">
                {event.track.name} · {event.track.country}
                {event.track.lengthKm ? ` · ${event.track.lengthKm} km` : ""}
              </p>
            </div>
            {event.myRegistration && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${statusBadge[event.myRegistration.status]}`}>
                {statusLabel[event.myRegistration.status]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2.5 flex-wrap">
            <p className="text-xs text-muted">{formatDate(event.date)} · {formatTime(event.date)}</p>
            <p className="text-xs text-muted">by {event.creatorName}</p>
            {event.maxParticipants && (
              <p className={`text-xs font-medium ${isFull ? "text-red" : "text-muted"}`}>
                {event.registrationCount} / {event.maxParticipants} spots{isFull ? " (full)" : ""}
              </p>
            )}
          </div>

          {event.allowedClasses && event.allowedClasses.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              {event.allowedClasses.map((c) => (
                <span key={c} className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${classBadge[c as keyof typeof classBadge] ?? "text-muted border-card"}`}>
                  {c}
                </span>
              ))}
            </div>
          )}

          {event.description && (
            <p className="text-xs text-muted mt-2.5 leading-relaxed line-clamp-2">{event.description}</p>
          )}
        </div>
      </div>

      {!isPast && (
        <div className="bg-surface px-5 py-2.5 flex items-center justify-between gap-4 border-t border-card">
          <div className="flex items-center gap-1">
            {event.isCreator && (
              <>
                <button onClick={onEdit} className="text-xs text-muted hover:text-off-white transition-colors px-2 py-1 rounded hover:bg-off-white/5">
                  Edit
                </button>
                <button onClick={onDelete} disabled={deleting} className="text-xs text-muted hover:text-red transition-colors px-2 py-1 rounded hover:bg-red/5 disabled:opacity-40">
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {event.myRegistration ? (
              <button onClick={onCancelRegistration} disabled={cancelling} className="text-xs text-muted hover:text-red transition-colors px-2 py-1 rounded hover:bg-red/5 disabled:opacity-40">
                {cancelling ? "Cancelling…" : "Cancel registration"}
              </button>
            ) : (
              <button
                onClick={onRegister}
                disabled={isFull || !hasCompatibleCar || cars.length === 0}
                title={
                  cars.length === 0 ? "Add a car to your garage first"
                  : !hasCompatibleCar ? "No compatible car in your garage"
                  : isFull ? "Event is full"
                  : undefined
                }
                className="text-xs bg-red text-off-white font-semibold px-3 py-1.5 rounded hover:opacity-80 transition-opacity disabled:opacity-30"
              >
                Register
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
