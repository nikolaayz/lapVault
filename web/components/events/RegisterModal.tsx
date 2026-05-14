import { Field } from "@/components/ui/Field";
import { inputClass } from "@/lib/ui";
import { formatDate } from "@/lib/eventUtils";
import type { Event, EventCar } from "@/lib/eventUtils";

export function RegisterModal({
  event,
  cars,
  carId,
  onCarChange,
  onRegister,
  onClose,
  saving,
  error,
}: {
  event: Event;
  cars: EventCar[];
  carId: string;
  onCarChange: (id: string) => void;
  onRegister: () => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
}) {
  const allowed = event.allowedClasses;
  const compatibleCars = allowed?.length ? cars.filter((c) => allowed.includes(c.class)) : cars;
  const selectedCar = cars.find((c) => c.id.toString() === carId);
  const classOk = !allowed?.length || (selectedCar && allowed.includes(selectedCar.class));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface rounded-xl w-full max-w-md p-6 flex flex-col gap-5 border border-card">
        <div>
          <h2 className="text-xl font-bold">Register for Event</h2>
          <p className="text-sm text-muted mt-1">{event.title} · {formatDate(event.date)}</p>
        </div>

        {cars.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted">No cars in your garage.</p>
            <a href="/garage" className="text-xs text-red hover:underline mt-1 inline-block">Add a car →</a>
          </div>
        ) : (
          <Field label="Select Car" required>
            <select value={carId} onChange={(e) => onCarChange(e.target.value)} className={inputClass}>
              {cars.map((c) => {
                const ok = !allowed?.length || allowed.includes(c.class);
                return (
                  <option key={c.id} value={c.id} disabled={!ok}>
                    {c.year} {c.make} {c.model} — {c.class}{!ok ? " (not allowed)" : ""}
                  </option>
                );
              })}
            </select>
          </Field>
        )}

        {compatibleCars.length === 0 && cars.length > 0 && (
          <p className="text-sm text-amber-400">None of your cars match the allowed classes for this event.</p>
        )}
        {!classOk && selectedCar && (
          <p className="text-sm text-red">This car class is not allowed for this event.</p>
        )}
        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-off-white transition-colors">Cancel</button>
          <button
            onClick={onRegister}
            disabled={saving || !carId || !classOk || cars.length === 0}
            className="bg-red text-off-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {saving ? "Registering..." : "Confirm Registration"}
          </button>
        </div>
      </div>
    </div>
  );
}
