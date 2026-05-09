import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { laps, cars, tracks } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import LapsClient, { type Lap, type LapCar, type Track } from "./LapsClient";

async function getPageData(userId: number) {
  const [userCars, allTracks, lapRows] = await Promise.all([
    db
      .select({ id: cars.id, make: cars.make, model: cars.model, year: cars.year, class: cars.class })
      .from(cars)
      .where(eq(cars.ownerId, userId))
      .orderBy(asc(cars.make)),

    db
      .select({ id: tracks.id, name: tracks.name, country: tracks.country, lengthKm: tracks.lengthKm })
      .from(tracks)
      .orderBy(asc(tracks.name)),

    db
      .select({
        id: laps.id,
        lapTimeMs: laps.lapTimeMs,
        sector1Ms: laps.sector1Ms,
        sector2Ms: laps.sector2Ms,
        sector3Ms: laps.sector3Ms,
        conditions: laps.conditions,
        notes: laps.notes,
        createdAt: laps.createdAt,
        carId: cars.id,
        carMake: cars.make,
        carModel: cars.model,
        carYear: cars.year,
        carClass: cars.class,
        trackId: tracks.id,
        trackName: tracks.name,
        trackCountry: tracks.country,
        trackLengthKm: tracks.lengthKm,
      })
      .from(laps)
      .innerJoin(cars, eq(laps.carId, cars.id))
      .innerJoin(tracks, eq(laps.trackId, tracks.id))
      .where(eq(laps.userId, userId))
      .orderBy(desc(laps.createdAt)),
  ]);

  const initialLaps: Lap[] = lapRows.map((r) => ({
    id: r.id,
    lapTimeMs: r.lapTimeMs,
    sector1Ms: r.sector1Ms,
    sector2Ms: r.sector2Ms,
    sector3Ms: r.sector3Ms,
    conditions: r.conditions,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    car: { id: r.carId, make: r.carMake, model: r.carModel, year: r.carYear, class: r.carClass },
    track: { id: r.trackId, name: r.trackName, country: r.trackCountry, lengthKm: r.trackLengthKm },
  }));

  return { userCars, allTracks, initialLaps };
}

export default async function LapsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let initialLaps: Lap[] = [];
  let userCars: LapCar[] = [];
  let allTracks: Track[] = [];

  if (token) {
    try {
      const { userId } = await verifyToken(token);
      ({ userCars, allTracks, initialLaps } = await getPageData(userId));
    } catch {
      // layout handles redirect
    }
  }

  return <LapsClient initialLaps={initialLaps} cars={userCars} tracks={allTracks} />;
}