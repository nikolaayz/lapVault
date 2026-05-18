import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { events, tracks, users, eventRegistrations, cars } from "@/lib/db/schema";
import { eq, asc, count } from "drizzle-orm";
import EventsClient, { type Event, type EventCar, type EventTrack } from "./EventsClient";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 25;

async function getPageData(userId: number, page: number) {
  const offset = (page - 1) * PAGE_SIZE;

  const [eventRows, regCountRows, userRegRows, userCars, allTracks, [{ total }]] = await Promise.all([
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
      .orderBy(asc(events.date))
      .limit(PAGE_SIZE)
      .offset(offset),

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

    db.select({ total: count() }).from(events),
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

  return { initialEvents, userCars, allTracks, total: Number(total) };
}

export default async function EventsPage(props: { searchParams: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const page = Math.max(parseInt(searchParams.page ?? "1"), 1);

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let initialEvents: Event[] = [];
  let userCars: EventCar[] = [];
  let allTracks: EventTrack[] = [];
  let isAdmin = false;
  let total = 0;

  if (token) {
    try {
      const { userId, role } = await verifyToken(token);
      isAdmin = role === "admin";
      ({ initialEvents, userCars, allTracks, total } = await getPageData(userId, page));
    } catch {
      // layout handles redirect
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <EventsClient initialEvents={initialEvents} cars={userCars} tracks={allTracks} isAdmin={isAdmin} />
      <Pagination page={page} totalPages={totalPages} total={total} basePath="/events" />
    </>
  );
}
