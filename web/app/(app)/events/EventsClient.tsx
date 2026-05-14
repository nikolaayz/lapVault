"use client";

import { useState } from "react";
import {
  type Event, type EventCar, type EventTrack, type EventFormData,
  emptyEventForm, eventToForm,
} from "@/lib/eventUtils";
import { EventCard } from "@/components/events/EventCard";
import { EventModal } from "@/components/events/EventModal";
import { RegisterModal } from "@/components/events/RegisterModal";

export type { Event, EventCar, EventTrack };

type ModalState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; event: Event }
  | { open: true; mode: "register"; event: Event };

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
  const [form, setForm] = useState<EventFormData>(emptyEventForm);
  const [registerCarId, setRegisterCarId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const now = new Date().toISOString();
  const upcoming = eventList.filter((e) => e.date >= now);
  const past = eventList.filter((e) => e.date < now).reverse();

  function openCreate() {
    setForm(emptyEventForm);
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
    const compatible = allowed?.length ? cars.filter((c) => allowed.includes(c.class)) : cars;
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
          id: data.id, title: payload.title, date: payload.date,
          maxParticipants: payload.maxParticipants, allowedClasses: payload.allowedClasses,
          description: payload.description, createdAt: data.createdAt,
          isCreator: true, creatorName: "", track, registrationCount: 0, myRegistration: null,
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
            .map((e) => e.id === modal.event.id
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
        prev.map((e) => e.id === modal.event.id
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
          prev.map((e) => e.id === eventId
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
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-red mb-1">Track Days</p>
          <h1 className="text-3xl font-bold">Events</h1>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="bg-red text-off-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-80 transition-opacity">
            + Create Event
          </button>
        )}
      </div>

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
            <EventCard key={event.id} event={event} cars={cars} isPast={false}
              onEdit={() => openEdit(event)} onDelete={() => handleDelete(event.id)}
              onRegister={() => openRegister(event)} onCancelRegistration={() => handleCancelRegistration(event.id)}
              deleting={deletingId === event.id} cancelling={cancellingId === event.id}
            />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Past</p>
          {past.map((event) => (
            <EventCard key={event.id} event={event} cars={cars} isPast
              onEdit={() => openEdit(event)} onDelete={() => handleDelete(event.id)}
              onRegister={() => {}} onCancelRegistration={() => {}}
              deleting={deletingId === event.id} cancelling={false}
            />
          ))}
        </section>
      )}

      {modal.open && modal.mode !== "register" && (
        <EventModal mode={modal.mode} form={form} onChange={setForm}
          onSave={handleSaveEvent} onClose={closeModal}
          saving={saving} error={formError} tracks={tracks}
        />
      )}

      {modal.open && modal.mode === "register" && (
        <RegisterModal event={modal.event} cars={cars} carId={registerCarId}
          onCarChange={setRegisterCarId} onRegister={handleRegister}
          onClose={closeModal} saving={saving} error={formError}
        />
      )}
    </div>
  );
}
