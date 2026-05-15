import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import LeaderboardClient from "./LeaderboardClient";

export default async function LeaderboardPage() {
  const allTracks = await db
    .select({ id: tracks.id, name: tracks.name, country: tracks.country, lengthKm: tracks.lengthKm })
    .from(tracks)
    .orderBy(asc(tracks.name));

  return <LeaderboardClient tracks={allTracks} />;
}
