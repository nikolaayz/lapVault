"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { inputClass } from "@/lib/ui";
import { CarClass, CAR_CLASSES } from "@/lib/types";
import { EditIcon, TrashIcon } from "@/components/ui/icons";

export interface Car {
  id: number;
  ownerId: number;
  make: string;
  model: string;
  year: number;
  powerHp: number | null;
  weightKg: number | null;
  class: CarClass;
  modifications: string | null;
  photoUrl: string | null;
  createdAt: string;
}

interface FormData {
  make: string;
  model: string;
  year: string;
  powerHp: string;
  weightKg: string;
  class: CarClass;
  modifications: string;
}

const emptyForm: FormData = {
  make: "",
  model: "",
  year: new Date().getFullYear().toString(),
  powerHp: "",
  weightKg: "",
  class: "Street",
  modifications: "",
};

function carToForm(car: Car): FormData {
  return {
    make: car.make,
    model: car.model,
    year: car.year.toString(),
    powerHp: car.powerHp?.toString() ?? "",
    weightKg: car.weightKg?.toString() ?? "",
    class: car.class,
    modifications: car.modifications ?? "",
  };
}

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; car: Car };

export default function GarageClient({ initialCars }: { initialCars: Car[] }) {
  const [carList, setCarList] = useState<Car[]>(initialCars);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function openAdd() {
    setForm(emptyForm);
    setFormError(null);
    setModal({ open: true, mode: "add" });
  }

  function openEdit(car: Car) {
    setForm(carToForm(car));
    setFormError(null);
    setModal({ open: true, mode: "edit", car });
  }

  function closeModal() {
    setModal({ open: false });
  }

  async function handleSave() {
    if (!modal.open) return;
    setSaving(true);
    setFormError(null);

    const payload = {
      make: form.make.trim(),
      model: form.model.trim(),
      year: parseInt(form.year),
      class: form.class,
      powerHp: form.powerHp ? parseInt(form.powerHp) : null,
      weightKg: form.weightKg ? parseInt(form.weightKg) : null,
      modifications: form.modifications.trim() || null,
    };

    try {
      if (modal.mode === "add") {
        const res = await fetch("/api/cars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error ?? "Failed to add car"); return; }
        setCarList((prev) => [...prev, data]);
      } else {
        const res = await fetch(`/api/cars/${modal.car.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error ?? "Failed to update car"); return; }
        setCarList((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/cars/${id}`, { method: "DELETE" });
      if (res.ok) setCarList((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-red mb-1">Garage</p>
          <h1 className="text-3xl font-bold">My Cars</h1>
        </div>
        <button
          onClick={openAdd}
          className="bg-red text-off-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
        >
          + Add Car
        </button>
      </div>

      {carList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-5xl mb-4">🏎</p>
          <p className="text-sm text-muted">No cars in your garage yet.</p>
          <p className="text-xs text-muted mt-1">Add your first car to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {carList.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              onEdit={() => openEdit(car)}
              onDelete={() => handleDelete(car.id)}
              deleting={deletingId === car.id}
            />
          ))}
        </div>
      )}

      {modal.open && (
        <CarModal
          mode={modal.mode}
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          error={formError}
        />
      )}
    </div>
  );
}

const classBadge: Record<CarClass, string> = {
  Street: "text-blue bg-blue/10 border-blue/20",
  "Street Modified": "text-off-white bg-off-white/5 border-off-white/15",
  "Track Prepared": "text-red-light bg-red/10 border-red/20",
  Race: "text-red bg-red/10 border-red/30",
};

function CarCard({
  car,
  onEdit,
  onDelete,
  deleting,
}: {
  car: Car;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="bg-card rounded-lg p-5 border border-card flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-lg leading-tight truncate">
            {car.year} {car.make} {car.model}
          </p>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1.5 inline-block border ${classBadge[car.class]}`}
          >
            {car.class}
          </span>
        </div>
        <div className="flex gap-1 shrink-0 mt-0.5">
          <button
            onClick={onEdit}
            className="text-muted hover:text-off-white transition-colors p-1.5 rounded hover:bg-off-white/5"
            title="Edit"
          >
            <EditIcon />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="text-muted hover:text-red transition-colors p-1.5 rounded hover:bg-red/5 disabled:opacity-40"
            title="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Power</p>
          <p className="font-semibold text-sm">{car.powerHp != null ? `${car.powerHp} hp` : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Weight</p>
          <p className="font-semibold text-sm">{car.weightKg != null ? `${car.weightKg} kg` : "—"}</p>
        </div>
      </div>

      {car.modifications && (
        <p className="text-xs text-muted border-t border-card pt-3 leading-relaxed line-clamp-2">
          {car.modifications}
        </p>
      )}
    </div>
  );
}

function CarModal({
  mode,
  form,
  onChange,
  onSave,
  onClose,
  saving,
  error,
}: {
  mode: "add" | "edit";
  form: FormData;
  onChange: (f: FormData) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
}) {
  function set(key: keyof FormData, value: string) {
    onChange({ ...form, [key]: value });
  }

  const canSave = form.make.trim() && form.model.trim() && form.year && !saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface rounded-xl w-full max-w-md p-6 flex flex-col gap-5 border border-card">
        <h2 className="text-xl font-bold">{mode === "add" ? "Add Car" : "Edit Car"}</h2>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Make" required>
              <input
                value={form.make}
                onChange={(e) => set("make", e.target.value)}
                placeholder="BMW"
                className={inputClass}
              />
            </Field>
            <Field label="Model" required>
              <input
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="M3"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Year" required>
              <input
                type="number"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                min={1950}
                max={new Date().getFullYear() + 1}
                className={inputClass}
              />
            </Field>
            <Field label="Class" required>
              <select
                value={form.class}
                onChange={(e) => set("class", e.target.value)}
                className={inputClass}
              >
                {CAR_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Power (hp)">
              <input
                type="number"
                value={form.powerHp}
                onChange={(e) => set("powerHp", e.target.value)}
                placeholder="420"
                className={inputClass}
              />
            </Field>
            <Field label="Weight (kg)">
              <input
                type="number"
                value={form.weightKg}
                onChange={(e) => set("weightKg", e.target.value)}
                placeholder="1450"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Modifications">
            <textarea
              value={form.modifications}
              onChange={(e) => set("modifications", e.target.value)}
              placeholder="Stage 2 tune, coilovers, roll cage..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted hover:text-off-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="bg-red text-off-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}


