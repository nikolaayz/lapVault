import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import LeaderboardClient from "./LeaderboardClient";

export default async function LeaderboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let allTracks: { id: number; name: string; country: string; lengthKm: string | null }[] = [];

  if (token) {
    try {
      await verifyToken(token);
      allTracks = await db
        .select({ id: tracks.id, name: tracks.name, country: tracks.country, lengthKm: tracks.lengthKm })
        .from(tracks)
        .orderBy(asc(tracks.name));
    } catch {
      // layout handles redirect
    }
  }

  return <LeaderboardClient tracks={allTracks} />;
}
