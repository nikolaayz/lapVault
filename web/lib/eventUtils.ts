import { formatDateLong } from "@/lib/formatters";
import type { CarClass } from "@/lib/types";

export type RegistrationStatus = "pending" | "confirmed" | "cancelled";

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

export interface EventFormData {
  trackId: string;
  title: string;
  date: string;
  maxParticipants: string;
  allowedClasses: CarClass[];
  description: string;
}

export const emptyEventForm: EventFormData = {
  trackId: "",
  title: "",
  date: "",
  maxParticipants: "",
  allowedClasses: [],
  description: "",
};

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function getDateParts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),
  };
}

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function eventToForm(event: Event): EventFormData {
  return {
    trackId: event.track.id.toString(),
    title: event.title,
    date: toDatetimeLocal(event.date),
    maxParticipants: event.maxParticipants?.toString() ?? "",
    allowedClasses: (event.allowedClasses ?? []) as CarClass[],
    description: event.description ?? "",
  };
}

export { formatDateLong as formatDate };
