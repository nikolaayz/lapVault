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
  isCreator: boolean;
  creatorName: string;
  track: EventTrack;
  registrationCount: number;
  myRegistration: { carId: number; status: RegistrationStatus } | null;
}

export interface EventFormState {
  trackId: string;
  title: string;
  date: string;
  maxParticipants: string;
  allowedClasses: CarClass[];
  description: string;
}

export const emptyForm: EventFormState = {
  trackId: "", title: "", date: "", maxParticipants: "", allowedClasses: [], description: "",
};

export function eventToForm(event: Event): EventFormState {
  const d = new Date(event.date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    trackId: event.track.id.toString(),
    title: event.title,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
    maxParticipants: event.maxParticipants?.toString() ?? "",
    allowedClasses: (event.allowedClasses ?? []) as CarClass[],
    description: event.description ?? "",
  };
}

export const statusColor: Record<RegistrationStatus, string> = {
  pending: "#FBBF24",
  confirmed: "#34D399",
  cancelled: "#6B6B80",
};

export const statusBg: Record<RegistrationStatus, string> = {
  pending: "rgba(251,191,36,0.12)",
  confirmed: "rgba(52,211,153,0.12)",
  cancelled: "rgba(107,107,128,0.12)",
};

export const statusLabel: Record<RegistrationStatus, string> = {
  pending: "Registered",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};
