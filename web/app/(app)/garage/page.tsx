import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { cars } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import GarageClient, { Car } from "./GarageClient";

async function getUserCars(userId: number): Promise<Car[]> {
  const rows = await db.select().from(cars).where(eq(cars.ownerId, userId));
  return rows.map((car) => ({ ...car, createdAt: car.createdAt.toISOString() }));
}

export default async function GaragePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let initialCars: Car[] = [];

  if (token) {
    try {
      const { userId } = await verifyToken(token);
      initialCars = await getUserCars(userId);
    } catch {
      // layout will handle unauthenticated redirect
    }
  }

  return <GarageClient initialCars={initialCars} />;
}