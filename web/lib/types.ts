export type CarClass = "Street" | "Street Modified" | "Track Prepared" | "Race";

export const CAR_CLASSES: CarClass[] = ["Street", "Street Modified", "Track Prepared", "Race"];

export const classBadge: Record<CarClass, string> = {
  Street: "text-blue bg-blue/10 border-blue/20",
  "Street Modified": "text-off-white bg-off-white/5 border-off-white/15",
  "Track Prepared": "text-red-light bg-red/10 border-red/20",
  Race: "text-red bg-red/10 border-red/30",
};
