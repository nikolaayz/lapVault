export type CarClass = "Street" | "Street Modified" | "Track Prepared" | "Race";

export const CAR_CLASSES: CarClass[] = ["Street", "Street Modified", "Track Prepared", "Race"];

export const classBadge: Record<CarClass, { bg: string; text: string; border: string }> = {
  Street: { bg: "rgba(59,130,246,0.12)", text: "#60A5FA", border: "rgba(59,130,246,0.25)" },
  "Street Modified": { bg: "rgba(240,240,245,0.07)", text: "#C0C0D0", border: "rgba(240,240,245,0.15)" },
  "Track Prepared": { bg: "rgba(230,59,25,0.1)", text: "#FF6B4A", border: "rgba(230,59,25,0.25)" },
  Race: { bg: "rgba(230,59,25,0.12)", text: "#E63B19", border: "rgba(230,59,25,0.3)" },
};
