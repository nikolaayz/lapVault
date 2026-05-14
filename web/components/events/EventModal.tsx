import { Field } from "@/components/ui/Field";
import { inputClass } from "@/lib/ui";
import { CAR_CLASSES, classBadge } from "@/lib/types";
import type { CarClass } from "@/lib/types";
import type { EventFormData, EventTrack } from "@/lib/eventUtils";

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function EventModal({
  mode,
  form,
  onChange,
  onSave,
  onClose,
  saving,
  error,
  tracks,
}: {
  mode: "create" | "edit";
  form: EventFormData;
  onChange: (f: EventFormData) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
  tracks: EventTrack[];
}) {
  function set(key: keyof EventFormData, value: EventFormData[typeof key]) {
    onChange({ ...form, [key]: value });
  }

  function toggleClass(cls: CarClass) {
    const next = form.allowedClasses.includes(cls)
      ? form.allowedClasses.filter((c) => c !== cls)
      : [...form.allowedClasses, cls];
    set("allowedClasses", next);
  }

  const canSave = !!(form.trackId && form.title.trim() && form.date && !saving);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface rounded-xl w-full max-w-lg p-6 flex flex-col gap-5 border border-card max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold">{mode === "create" ? "Create Event" : "Edit Event"}</h2>

        <div className="flex flex-col gap-4">
          <Field label="Title" required>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="BMW Club Track Day" className={inputClass} />
          </Field>

          <Field label="Track" required>
            <select value={form.trackId} onChange={(e) => set("trackId", e.target.value)} className={inputClass}>
              <option value="">Select a track…</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {t.country}</option>
              ))}
            </select>
          </Field>

          <Field label="Date & Time" required>
            <div className="relative">
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={`${inputClass} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                <CalendarIcon />
              </span>
            </div>
          </Field>

          <Field label="Max Participants">
            <input type="number" value={form.maxParticipants} onChange={(e) => set("maxParticipants", e.target.value)} placeholder="20" min={1} className={inputClass} />
          </Field>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
              Allowed Classes <span className="normal-case font-normal">(optional — leave empty for all)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {CAR_CLASSES.map((cls) => {
                const selected = form.allowedClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleClass(cls)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${selected ? classBadge[cls] : "text-muted border-card hover:border-off-white/30"}`}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Description">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Additional details, requirements, venue info..." rows={3} className={`${inputClass} resize-none`} />
          </Field>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-off-white transition-colors">Cancel</button>
          <button onClick={onSave} disabled={!canSave} className="bg-red text-off-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40">
            {saving ? "Saving..." : mode === "create" ? "Create Event" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
