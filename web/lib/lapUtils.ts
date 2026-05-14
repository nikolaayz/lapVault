import { formatMs } from "@/lib/formatters";
import type { CarClass } from "@/lib/types";

export type Conditions = "dry" | "wet" | "damp";

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

export interface LapGroup {
  track: Track;
  laps: Lap[];
  bestMs: number;
  possibleBestMs: number | null;
  latestAt: string;
}

export interface LapFormData {
  trackId: string;
  carId: string;
  lapTime: string;
  sector1: string;
  sector2: string;
  sector3: string;
  conditions: Conditions;
  notes: string;
}

export const emptyLapForm: LapFormData = {
  trackId: "",
  carId: "",
  lapTime: "",
  sector1: "",
  sector2: "",
  sector3: "",
  conditions: "dry",
  notes: "",
};

export function parseTimeToMs(str: string): number | null {
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

export function computePossibleBest(laps: Lap[]): number | null {
  const complete = laps.filter(
    (l) => l.sector1Ms != null && l.sector2Ms != null && l.sector3Ms != null
  );
  if (complete.length === 0) return null;
  const bestS1 = Math.min(...complete.map((l) => l.sector1Ms!));
  const bestS2 = Math.min(...complete.map((l) => l.sector2Ms!));
  const bestS3 = Math.min(...complete.map((l) => l.sector3Ms!));
  return bestS1 + bestS2 + bestS3;
}

export function buildGroups(lapList: Lap[]): LapGroup[] {
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

export function lapToForm(lap: Lap): LapFormData {
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
