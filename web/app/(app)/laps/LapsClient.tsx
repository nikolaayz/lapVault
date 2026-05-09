"use client";

import { useState, type ReactNode } from "react";

export type CarClass = "Street" | "Street Modified" | "Track Prepared" | "Race";
type Conditions = "dry" | "wet" | "damp";

export interface Track {
  id: number;
  name: string;
  country: string;
  lengthKm: string | null;
}

export interface LapCar {
  id: number;
  make: string;
  model: string;
  year: number;
  class: CarClass;
}

export interface Lap {
  id: number;
  lapTimeMs: number;
  sector1Ms: number | null;
  sector2Ms: number | null;
  sector3Ms: number | null;
  conditions: Conditions;
  notes: string | null;
  createdAt: string;
  car: LapCar;
  track: Track;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function parseTimeToMs(str: string): number | null {
  const trimmed = str.trim();
  if (!trimmed) return null;
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx === -1) {
    const s = parseFloat(trimmed);
    return isNaN(s) || s < 0 ? null : Math.round(s * 1000);
  }
  const m = parseInt(trimmed.slice(0, colonIdx));
  const s = parseFloat(trimmed.slice(colonIdx + 1));
  if (isNaN(m) || isNaN(s) || m < 0 || s < 0) return null;
  return m * 60_000 + Math.round(s * 1000);
}

function formatMs(ms: number): string {
  const m = Math.floor(ms / 60_000);
  const sec = ((ms % 60_000) / 1000).toFixed(3);
  return m > 0 ? `${m}:${sec}` : sec;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Grouping ───────────────────────────────────────────────────────────────────

interface LapGroup {
  track: Track;
  laps: Lap[];
  bestMs: number;
  possibleBestMs: number | null;
  latestAt: string;
}

function computePossibleBest(laps: Lap[]): number | null {
  const complete = laps.filter(
    (l) => l.sector1Ms != null && l.sector2Ms != null && l.sector3Ms != null
  );
  if (complete.length === 0) return null;
  const bestS1 = Math.min(...complete.map((l) => l.sector1Ms!));
  const bestS2 = Math.min(...complete.map((l) => l.sector2Ms!));
  const bestS3 = Math.min(...complete.map((l) => l.sector3Ms!));
  return bestS1 + bestS2 + bestS3;
}

function buildGroups(lapList: Lap[]): LapGroup[] {
  const map = new Map<number, LapGroup>();
  for (const lap of lapList) {
    const g = map.get(lap.track.id);
    if (!g) {
      map.set(lap.track.id, { track: lap.track, laps: [lap], bestMs: lap.lapTimeMs, possibleBestMs: null, latestAt: lap.createdAt });
    } else {
      g.laps.push(lap);
      if (lap.lapTimeMs < g.bestMs) g.bestMs = lap.lapTimeMs;
      if (lap.createdAt > g.latestAt) g.latestAt = lap.createdAt;
    }
  }
  const groups = Array.from(map.values());
  for (const g of groups) {
    g.laps.sort((a, b) => a.lapTimeMs - b.lapTimeMs);
    g.possibleBestMs = computePossibleBest(g.laps);
  }
  groups.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  return groups;
}

// ── Form ───────────────────────────────────────────────────────────────────────

interface FormData {
  trackId: string;
  carId: string;
  lapTime: string;
  sector1: string;
  sector2: string;
  sector3: string;
  conditions: Conditions;
  notes: string;
}

const emptyForm: FormData = {
  trackId: "",
  carId: "",
  lapTime: "",
  sector1: "",
  sector2: "",
  sector3: "",
  conditions: "dry",
  notes: "",
};

function lapToForm(lap: Lap): FormData {
  return {
    trackId: lap.track.id.toString(),
    carId: lap.car.id.toString(),
    lapTime: formatMs(lap.lapTimeMs),
    sector1: lap.sector1Ms != null ? formatMs(lap.sector1Ms) : "",
    sector2: lap.sector2Ms != null ? formatMs(lap.sector2Ms) : "",
    sector3: lap.sector3Ms != null ? formatMs(lap.sector3Ms) : "",
    conditions: lap.conditions,
    notes: lap.notes ?? "",
  };
}

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; lap: Lap };

// ── Root component ─────────────────────────────────────────────────────────────

export default function LapsClient({
  initialLaps,
  cars,
  tracks,
}: {
  initialLaps: Lap[];
  cars: LapCar[];
  tracks: Track[];
}) {
  const [lapList, setLapList] = useState<Lap[]>(initialLaps);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const groups = buildGroups(lapList);

  function openAdd() {
    setForm(emptyForm);
    setFormError(null);
    setModal({ open: true, mode: "add" });
  }

  function openEdit(lap: Lap) {
    setForm(lapToForm(lap));
    setFormError(null);
    setModal({ open: true, mode: "edit", lap });
  }

  function closeModal() {
    setModal({ open: false });
  }

  async function handleSave() {
    if (!modal.open) return;
    setFormError(null);

    const lapTimeMs = parseTimeToMs(form.lapTime);
    if (lapTimeMs === null) {
      setFormError("Invalid lap time — use M:SS.mmm format, e.g. 1:23.456");
      return;
    }
    const s1 = form.sector1 ? parseTimeToMs(form.sector1) : null;
    const s2 = form.sector2 ? parseTimeToMs(form.sector2) : null;
    const s3 = form.sector3 ? parseTimeToMs(form.sector3) : null;
    if (form.sector1 && s1 === null) { setFormError("Invalid sector 1 time"); return; }
    if (form.sector2 && s2 === null) { setFormError("Invalid sector 2 time"); return; }
    if (form.sector3 && s3 === null) { setFormError("Invalid sector 3 time"); return; }

    const payload = {
      carId: parseInt(form.carId),
      trackId: parseInt(form.trackId),
      lapTimeMs,
      sector1Ms: s1,
      sector2Ms: s2,
      sector3Ms: s3,
      conditions: form.conditions,
      notes: form.notes || null,
    };

    setSaving(true);
    try {
      if (modal.mode === "add") {
        const res = await fetch("/api/laps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error ?? "Failed to log lap"); return; }

        const car = cars.find((c) => c.id === payload.carId)!;
        const track = tracks.find((t) => t.id === payload.trackId)!;
        setLapList((prev) => [
          { id: data.id, ...payload, notes: payload.notes, createdAt: data.createdAt, car, track },
          ...prev,
        ]);
      } else {
        const res = await fetch(`/api/laps/${modal.lap.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error ?? "Failed to update lap"); return; }

        const car = cars.find((c) => c.id === payload.carId)!;
        const track = tracks.find((t) => t.id === payload.trackId)!;
        setLapList((prev) =>
          prev.map((l) =>
            l.id === modal.lap.id
              ? { ...l, ...payload, notes: payload.notes, car, track }
              : l
          )
        );
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/laps/${id}`, { method: "DELETE" });
      if (res.ok) setLapList((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const canSave = !!(form.trackId && form.carId && parseTimeToMs(form.lapTime) !== null && !saving);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-red mb-1">Lap Times</p>
          <h1 className="text-3xl font-bold">My Laps</h1>
        </div>
        {cars.length > 0 && (
          <button
            onClick={openAdd}
            className="bg-red text-off-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
          >
            + Log Lap
          </button>
        )}
      </div>

      {/* No cars */}
      {cars.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-5xl mb-4">🏎</p>
          <p className="text-sm text-muted">Add a car to your garage before logging laps.</p>
          <a href="/garage" className="mt-3 text-xs text-red hover:underline">
            Go to Garage →
          </a>
        </div>
      )}

      {/* Empty laps */}
      {cars.length > 0 && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-5xl mb-4">⏱</p>
          <p className="text-sm text-muted">No laps logged yet.</p>
          <p className="text-xs text-muted mt-1">Hit the track and log your first lap.</p>
        </div>
      )}

      {/* Track groups */}
      {groups.map((group) => (
        <TrackGroupSection
          key={group.track.id}
          group={group}
          onEdit={openEdit}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      ))}

      {/* Modal */}
      {modal.open && (
        <LapModal
          mode={modal.mode}
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          canSave={canSave}
          error={formError}
          cars={cars}
          tracks={tracks}
        />
      )}
    </div>
  );
}

// ── Track group section ────────────────────────────────────────────────────────

function TrackGroupSection({
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
      {/* Group header */}
      <div className="bg-card px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
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

      {/* Lap rows */}
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

// ── Lap row ────────────────────────────────────────────────────────────────────

const conditionsBadge: Record<Conditions, string> = {
  dry: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  wet: "text-blue bg-blue/10 border-blue/20",
  damp: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

const classBadge: Record<CarClass, string> = {
  Street: "text-blue bg-blue/10 border-blue/20",
  "Street Modified": "text-off-white bg-off-white/5 border-off-white/15",
  "Track Prepared": "text-red-light bg-red/10 border-red/20",
  Race: "text-red bg-red/10 border-red/30",
};

function LapRow({
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
      {/* Time */}
      <p className={`font-mono font-bold text-sm w-20 shrink-0 ${isBest ? "text-red" : "text-off-white"}`}>
        {formatMs(lap.lapTimeMs)}
      </p>

      {/* Car */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <p className="text-sm truncate text-off-white">
          {lap.car.year} {lap.car.make} {lap.car.model}
        </p>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border shrink-0 ${classBadge[lap.car.class]}`}>
          {lap.car.class}
        </span>
      </div>

      {/* Conditions */}
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 capitalize ${conditionsBadge[lap.conditions]}`}
      >
        {lap.conditions}
      </span>

      {/* Sectors */}
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

      {/* Date */}
      <p className="text-xs text-muted shrink-0 hidden sm:block">{formatDate(lap.createdAt)}</p>

      {/* Actions */}
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

// ── Modal ──────────────────────────────────────────────────────────────────────

function LapModal({
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
  form: FormData;
  onChange: (f: FormData) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  canSave: boolean;
  error: string | null;
  cars: LapCar[];
  tracks: Track[];
}) {
  function set(key: keyof FormData, value: string) {
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
            <select value={form.trackId} onChange={(e) => set("trackId", e.target.value)} className={input}>
              <option value="">Select a track…</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.country}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Car" required>
            <select value={form.carId} onChange={(e) => set("carId", e.target.value)} className={input}>
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
                className={input}
              />
            </Field>
            <Field label="Conditions" required>
              <select value={form.conditions} onChange={(e) => set("conditions", e.target.value)} className={input}>
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
                <input value={form.sector1} onChange={(e) => set("sector1", e.target.value)} placeholder="28.123" className={input} />
              </Field>
              <Field label="Sector 2">
                <input value={form.sector2} onChange={(e) => set("sector2", e.target.value)} placeholder="32.456" className={input} />
              </Field>
              <Field label="Sector 3">
                <input value={form.sector3} onChange={(e) => set("sector3", e.target.value)} placeholder="22.877" className={input} />
              </Field>
            </div>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Setup changes, track conditions, remarks..."
              rows={2}
              className={`${input} resize-none`}
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

// ── Shared ─────────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-muted">
        {label}
        {required && <span className="text-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

const input =
  "bg-carbon border border-card rounded-lg px-3 py-2 text-sm text-off-white placeholder:text-muted/50 focus:outline-none focus:border-red transition-colors w-full";
