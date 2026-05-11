import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { events, tracks, users, eventRegistrations, cars } from "@/lib/db/schema";
import { eq, asc, count } from "drizzle-orm";
import EventsClient, { type Event, type EventCar, type EventTrack } from "./EventsClient";

async function getPageData(userId: number) {
  const [eventRows, regCountRows, userRegRows, userCars, allTracks] = await Promise.all([
    db
      .select({
        id: events.id,
        title: events.title,
        date: events.date,
        maxParticipants: events.maxParticipants,
        allowedClasses: events.allowedClasses,
        description: events.description,
        createdAt: events.createdAt,
        creatorId: events.createdBy,
        creatorName: users.name,
        trackId: tracks.id,
        trackName: tracks.name,
        trackCountry: tracks.country,
        trackLengthKm: tracks.lengthKm,
      })
      .from(events)
      .innerJoin(tracks, eq(events.trackId, tracks.id))
      .innerJoin(users, eq(events.createdBy, users.id))
      .orderBy(asc(events.date)),

    db
      .select({ eventId: eventRegistrations.eventId, total: count(eventRegistrations.id) })
      .from(eventRegistrations)
      .groupBy(eventRegistrations.eventId),

    db
      .select({ eventId: eventRegistrations.eventId, carId: eventRegistrations.carId, status: eventRegistrations.status })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userId, userId)),

    db
      .select({ id: cars.id, make: cars.make, model: cars.model, year: cars.year, class: cars.class })
      .from(cars)
      .where(eq(cars.ownerId, userId))
      .orderBy(asc(cars.make)),

    db
      .select({ id: tracks.id, name: tracks.name, country: tracks.country, lengthKm: tracks.lengthKm })
      .from(tracks)
      .orderBy(asc(tracks.name)),
  ]);

  const countMap = new Map(regCountRows.map((r) => [r.eventId, Number(r.total)]));
  const regMap = new Map(userRegRows.map((r) => [r.eventId, { carId: r.carId, status: r.status as "pending" | "confirmed" | "cancelled" }]));

  const initialEvents: Event[] = eventRows.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date.toISOString(),
    maxParticipants: r.maxParticipants,
    allowedClasses: r.allowedClasses,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    isCreator: r.creatorId === userId,
    creatorName: r.creatorName,
    track: { id: r.trackId, name: r.trackName, country: r.trackCountry, lengthKm: r.trackLengthKm },
    registrationCount: countMap.get(r.id) ?? 0,
    myRegistration: regMap.get(r.id) ?? null,
  }));

  return { initialEvents, userCars, allTracks };
}

export default async function EventsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let initialEvents: Event[] = [];
  let userCars: EventCar[] = [];
  let allTracks: EventTrack[] = [];

  if (token) {
    try {
      const { userId } = await verifyToken(token);
      ({ initialEvents, userCars, allTracks } = await getPageData(userId));
    } catch {
      // layout handles redirect
    }
  }

  return <EventsClient initialEvents={initialEvents} cars={userCars} tracks={allTracks} />;
}
