import { formatMs } from "@/lib/formatters";

export type Conditions = "dry" | "wet" | "damp";

export interface Track { id: number; name: string; country: string; lengthKm: string | null; }
export interface LapCar { id: number; make: string; model: string; year: number; class: string; }
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
export interface LapFormState {
  trackId: string;
  carId: string;
  lapTime: string;
  sector1: string;
  sector2: string;
  sector3: string;
  conditions: Conditions;
  notes: string;
}

export const emptyLapForm: LapFormState = {
  trackId: "", carId: "", lapTime: "", sector1: "", sector2: "", sector3: "", conditions: "dry", notes: "",
};

export const conditionColor: Record<Conditions, string> = {
  dry: "#34D399",
  wet: "#60A5FA",
  damp: "#FBBF24",
};

export const conditionBg: Record<Conditions, string> = {
  dry: "rgba(52,211,153,0.12)",
  wet: "rgba(96,165,250,0.12)",
  damp: "rgba(251,191,36,0.12)",
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
    const complete = g.laps.filter((l) => l.sector1Ms != null && l.sector2Ms != null && l.sector3Ms != null);
    if (complete.length > 0) {
      g.possibleBestMs =
        Math.min(...complete.map((l) => l.sector1Ms!)) +
        Math.min(...complete.map((l) => l.sector2Ms!)) +
        Math.min(...complete.map((l) => l.sector3Ms!));
    }
  }
  groups.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  return groups;
}

export function lapToForm(lap: Lap): LapFormState {
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
