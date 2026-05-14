import type { CarClass } from "@/lib/types";

export interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  powerHp: number | null;
  weightKg: number | null;
  class: CarClass;
  modifications: string | null;
}

export interface GarageFormState {
  make: string;
  model: string;
  year: string;
  powerHp: string;
  weightKg: string;
  class: CarClass;
  modifications: string;
}

export const emptyCarForm: GarageFormState = {
  make: "",
  model: "",
  year: new Date().getFullYear().toString(),
  powerHp: "",
  weightKg: "",
  class: "Street",
  modifications: "",
};

export function carToForm(car: Car): GarageFormState {
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
