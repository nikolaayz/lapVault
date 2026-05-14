import { Field } from "@/components/ui/Field";
import { inputClass } from "@/lib/ui";
import type { LapCar, Track, LapFormData } from "@/lib/lapUtils";

export function LapModal({
  mode,
  form,
  onChange,
  onSave,
  onClose,
  saving,
  canSave,
  error,
  cars,
  tracks,
}: {
  mode: "add" | "edit";
  form: LapFormData;
  onChange: (f: LapFormData) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  canSave: boolean;
  error: string | null;
  cars: LapCar[];
  tracks: Track[];
}) {
  function set(key: keyof LapFormData, value: string) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface rounded-xl w-full max-w-lg p-6 flex flex-col gap-5 border border-card max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold">{mode === "add" ? "Log Lap" : "Edit Lap"}</h2>

        <div className="flex flex-col gap-4">
          <Field label="Track" required>
            <select value={form.trackId} onChange={(e) => set("trackId", e.target.value)} className={inputClass}>
              <option value="">Select a track…</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.country}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Car" required>
            <select value={form.carId} onChange={(e) => set("carId", e.target.value)} className={inputClass}>
              <option value="">Select a car…</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.year} {c.make} {c.model} — {c.class}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Lap Time" required>
              <input
                value={form.lapTime}
                onChange={(e) => set("lapTime", e.target.value)}
                placeholder="1:23.456"
                className={inputClass}
              />
            </Field>
            <Field label="Conditions" required>
              <select value={form.conditions} onChange={(e) => set("conditions", e.target.value)} className={inputClass}>
                <option value="dry">Dry</option>
                <option value="wet">Wet</option>
                <option value="damp">Damp</option>
              </select>
            </Field>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
              Sector Times <span className="normal-case font-normal">(optional)</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Sector 1">
                <input value={form.sector1} onChange={(e) => set("sector1", e.target.value)} placeholder="28.123" className={inputClass} />
              </Field>
              <Field label="Sector 2">
                <input value={form.sector2} onChange={(e) => set("sector2", e.target.value)} placeholder="32.456" className={inputClass} />
              </Field>
              <Field label="Sector 3">
                <input value={form.sector3} onChange={(e) => set("sector3", e.target.value)} placeholder="22.877" className={inputClass} />
              </Field>
            </div>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Setup changes, track conditions, remarks..."
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </Field>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-off-white transition-colors">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="bg-red text-off-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {saving ? "Saving..." : mode === "add" ? "Save Lap" : "Update Lap"}
          </button>
        </div>
      </div>
    </div>
  );
}
