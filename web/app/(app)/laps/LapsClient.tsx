"use client";

import { useState } from "react";
import { CarClass } from "@/lib/types";
import {
  type Lap, type LapCar, type Track,
  type LapFormData,
  emptyLapForm, lapToForm, buildGroups, parseTimeToMs,
} from "@/lib/lapUtils";
import { TrackGroupSection } from "@/components/laps/TrackGroupSection";
import { LapModal } from "@/components/laps/LapModal";

export type { CarClass, Lap, LapCar, Track };

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; lap: Lap };

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
  const [form, setForm] = useState<LapFormData>(emptyLapForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const groups = buildGroups(lapList);

  function openAdd() {
    setForm(emptyLapForm);
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

      {cars.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-5xl mb-4">🏎</p>
          <p className="text-sm text-muted">Add a car to your garage before logging laps.</p>
          <a href="/garage" className="mt-3 text-xs text-red hover:underline">Go to Garage →</a>
        </div>
      )}

      {cars.length > 0 && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-5xl mb-4">⏱</p>
          <p className="text-sm text-muted">No laps logged yet.</p>
          <p className="text-xs text-muted mt-1">Hit the track and log your first lap.</p>
        </div>
      )}

      {groups.map((group) => (
        <TrackGroupSection
          key={group.track.id}
          group={group}
          onEdit={openEdit}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      ))}

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
