"use client";

import { useState, type ReactNode } from "react";

export type RegistrationStatus = "pending" | "confirmed" | "cancelled";
export type CarClass = "Street" | "Street Modified" | "Track Prepared" | "Race";

export interface EventTrack {
  id: number;
  name: string;
  country: string;
  lengthKm: string | null;
}

export interface EventCar {
  id: number;
  make: string;
  model: string;
  year: number;
  class: CarClass;
}

export interface Event {
  id: number;
  title: string;
  date: string;
  maxParticipants: number | null;
  allowedClasses: string[] | null;
  description: string | null;
  createdAt: string;
  isCreator: boolean;
  creatorName: string;
  track: EventTrack;
  registrationCount: number;
  myRegistration: { carId: number; status: RegistrationStatus } | null;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

const CAR_CLASSES: CarClass[] = ["Street", "Street Modified", "Track Prepared", "Race"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function getDateParts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),
  };
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Form state ─────────────────────────────────────────────────────────────────

interface EventFormData {
  trackId: string;
  title: string;
  date: string;
  maxParticipants: string;
  allowedClasses: CarClass[];
  description: string;
}

const emptyForm: EventFormData = {
  trackId: "",
  title: "",
  date: "",
  maxParticipants: "",
  allowedClasses: [],
  description: "",
};

function eventToForm(event: Event): EventFormData {
  return {
    trackId: event.track.id.toString(),
    title: event.title,
    date: toDatetimeLocal(event.date),
    maxParticipants: event.maxParticipants?.toString() ?? "",
    allowedClasses: (event.allowedClasses ?? []) as CarClass[],
    description: event.description ?? "",
  };
}

type ModalState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; event: Event }
  | { open: true; mode: "register"; event: Event };

// ── Root component ─────────────────────────────────────────────────────────────

export default function EventsClient({
  initialEvents,
  cars,
  tracks,
  isAdmin,
}: {
  initialEvents: Event[];
  cars: EventCar[];
  tracks: EventTrack[];
  isAdmin: boolean;
}) {
  const [eventList, setEventList] = useState<Event[]>(initialEvents);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [form, setForm] = useState<EventFormData>(emptyForm);
  const [registerCarId, setRegisterCarId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const now = new Date().toISOString();
  const upcoming = eventList.filter((e) => e.date >= now);
  const past = eventList.filter((e) => e.date < now).reverse();

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setModal({ open: true, mode: "create" });
  }

  function openEdit(event: Event) {
    setForm(eventToForm(event));
    setFormError(null);
    setModal({ open: true, mode: "edit", event });
  }

  function openRegister(event: Event) {
    const allowed = event.allowedClasses;
    const compatible = allowed?.length
      ? cars.filter((c) => allowed.includes(c.class))
      : cars;
    setRegisterCarId(compatible[0]?.id.toString() ?? cars[0]?.id.toString() ?? "");
    setFormError(null);
    setModal({ open: true, mode: "register", event });
  }

  function closeModal() {
    setModal({ open: false });
    setFormError(null);
  }

  async function handleSaveEvent() {
    if (!modal.open || modal.mode === "register") return;
    setFormError(null);

    if (!form.trackId || !form.title.trim() || !form.date) {
      setFormError("Track, title, and date are required");
      return;
    }

    const payload = {
      trackId: parseInt(form.trackId),
      title: form.title.trim(),
      date: new Date(form.date).toISOString(),
      maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : null,
      allowedClasses: form.allowedClasses.length ? form.allowedClasses : null,
      description: form.description.trim() || null,
    };

    setSaving(true);
    try {
      if (modal.mode === "create") {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error ?? "Failed to create event"); return; }

        const track = tracks.find((t) => t.id === payload.trackId)!;
        const newEvent: Event = {
          id: data.id,
          title: payload.title,
          date: payload.date,
          maxParticipants: payload.maxParticipants,
          allowedClasses: payload.allowedClasses,
          description: payload.description,
          createdAt: data.createdAt,
          isCreator: true,
          creatorName: "",
          track,
          registrationCount: 0,
          myRegistration: null,
        };
        setEventList((prev) => [...prev, newEvent].sort((a, b) => a.date.localeCompare(b.date)));
      } else {
        const res = await fetch(`/api/events/${modal.event.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error ?? "Failed to update event"); return; }

        const track = tracks.find((t) => t.id === payload.trackId)!;
        setEventList((prev) =>
          prev
            .map((e) =>
              e.id === modal.event.id
                ? { ...e, title: payload.title, date: payload.date, maxParticipants: payload.maxParticipants, allowedClasses: payload.allowedClasses, description: payload.description, track }
                : e
            )
            .sort((a, b) => a.date.localeCompare(b.date))
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
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) setEventList((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRegister() {
    if (!modal.open || modal.mode !== "register") return;
    setFormError(null);

    if (!registerCarId) { setFormError("Select a car"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/events/${modal.event.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId: parseInt(registerCarId) }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to register"); return; }

      setEventList((prev) =>
        prev.map((e) =>
          e.id === modal.event.id
            ? { ...e, registrationCount: e.registrationCount + 1, myRegistration: { carId: parseInt(registerCarId), status: "confirmed" } }
            : e
        )
      );
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelRegistration(eventId: number) {
    setCancellingId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: "DELETE" });
      if (res.ok) {
        setEventList((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, registrationCount: Math.max(0, e.registrationCount - 1), myRegistration: null }
              : e
          )
        );
      }
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-red mb-1">Track Days</p>
          <h1 className="text-3xl font-bold">Events</h1>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="bg-red text-off-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
          >
            + Create Event
          </button>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length === 0 && past.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-sm text-muted">No events scheduled yet.</p>
          <p className="text-xs text-muted mt-1">Create one to get started.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Upcoming</p>
          {upcoming.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              cars={cars}
              isPast={false}
              onEdit={() => openEdit(event)}
              onDelete={() => handleDelete(event.id)}
              onRegister={() => openRegister(event)}
              onCancelRegistration={() => handleCancelRegistration(event.id)}
              deleting={deletingId === event.id}
              cancelling={cancellingId === event.id}
            />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Past</p>
          {past.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              cars={cars}
              isPast
              onEdit={() => openEdit(event)}
              onDelete={() => handleDelete(event.id)}
              onRegister={() => {}}
              onCancelRegistration={() => {}}
              deleting={deletingId === event.id}
              cancelling={false}
            />
          ))}
        </section>
      )}

      {/* Modals */}
      {modal.open && modal.mode !== "register" && (
        <EventModal
          mode={modal.mode}
          form={form}
          onChange={setForm}
          onSave={handleSaveEvent}
          onClose={closeModal}
          saving={saving}
          error={formError}
          tracks={tracks}
        />
      )}

      {modal.open && modal.mode === "register" && (
        <RegisterModal
          event={modal.event}
          cars={cars}
          carId={registerCarId}
          onCarChange={setRegisterCarId}
          onRegister={handleRegister}
          onClose={closeModal}
          saving={saving}
          error={formError}
        />
      )}
    </div>
  );
}

// ── Event card ─────────────────────────────────────────────────────────────────

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

const classBadge: Record<CarClass, string> = {
  Street: "text-blue bg-blue/10 border-blue/20",
  "Street Modified": "text-off-white bg-off-white/5 border-off-white/15",
  "Track Prepared": "text-red-light bg-red/10 border-red/20",
  Race: "text-red bg-red/10 border-red/30",
};

function EventCard({
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
        {/* Date badge */}
        <div className="flex flex-col items-center justify-center bg-carbon rounded-lg px-4 py-3 shrink-0 w-16 text-center">
          <p className="text-xs font-bold text-red tracking-widest">{month}</p>
          <p className="text-2xl font-bold text-off-white leading-tight">{day}</p>
          <p className="text-xs text-muted">{year}</p>
        </div>

        {/* Details */}
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
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${statusBadge[event.myRegistration.status]}`}
              >
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
                <span key={c} className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${classBadge[c as CarClass] ?? "text-muted border-card"}`}>
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

      {/* Actions */}
      {!isPast && (
        <div className="bg-surface px-5 py-2.5 flex items-center justify-between gap-4 border-t border-card">
          <div className="flex items-center gap-1">
            {event.isCreator && (
              <>
                <button
                  onClick={onEdit}
                  className="text-xs text-muted hover:text-off-white transition-colors px-2 py-1 rounded hover:bg-off-white/5"
                >
                  Edit
                </button>
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="text-xs text-muted hover:text-red transition-colors px-2 py-1 rounded hover:bg-red/5 disabled:opacity-40"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {event.myRegistration ? (
              <button
                onClick={onCancelRegistration}
                disabled={cancelling}
                className="text-xs text-muted hover:text-red transition-colors px-2 py-1 rounded hover:bg-red/5 disabled:opacity-40"
              >
                {cancelling ? "Cancelling…" : "Cancel registration"}
              </button>
            ) : (
              <button
                onClick={onRegister}
                disabled={isFull || !hasCompatibleCar || cars.length === 0}
                title={
                  cars.length === 0
                    ? "Add a car to your garage first"
                    : !hasCompatibleCar
                    ? "No compatible car in your garage"
                    : isFull
                    ? "Event is full"
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

// ── Event modal (create / edit) ────────────────────────────────────────────────

function EventModal({
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
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="BMW Club Track Day"
              className={input}
            />
          </Field>

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

          <Field label="Date & Time" required>
            <div className="relative">
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={`${input} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                <CalendarIcon />
              </span>
            </div>
          </Field>

          <Field label="Max Participants">
            <input
              type="number"
              value={form.maxParticipants}
              onChange={(e) => set("maxParticipants", e.target.value)}
              placeholder="20"
              min={1}
              className={input}
            />
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
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                      selected
                        ? classBadge[cls]
                        : "text-muted border-card hover:border-off-white/30"
                    }`}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Additional details, requirements, venue info..."
              rows={3}
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
            {saving ? "Saving..." : mode === "create" ? "Create Event" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Register modal ─────────────────────────────────────────────────────────────

function RegisterModal({
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
            <select value={carId} onChange={(e) => onCarChange(e.target.value)} className={input}>
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
          <p className="text-sm text-amber-400">
            None of your cars match the allowed classes for this event.
          </p>
        )}

        {!classOk && selectedCar && (
          <p className="text-sm text-red">This car class is not allowed for this event.</p>
        )}

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-off-white transition-colors">
            Cancel
          </button>
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

const input =
  "bg-carbon border border-card rounded-lg px-3 py-2 text-sm text-off-white placeholder:text-muted/50 focus:outline-none focus:border-red transition-colors w-full";
