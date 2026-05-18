import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "./lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function insertBatches<T>(
  label: string,
  items: T[],
  batchSize: number,
  insertFn: (batch: T[]) => Promise<void>,
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await insertFn(batch);
    process.stdout.write(`\r  ${label}: ${Math.min(i + batchSize, items.length)} / ${items.length}`);
  }
  console.log();
}

// ── Data pools ────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "James", "Emma", "Oliver", "Sophia", "William", "Isabella", "Ethan", "Mia",
  "Lucas", "Charlotte", "Mason", "Amelia", "Logan", "Harper", "Aiden", "Evelyn",
  "Benjamin", "Abigail", "Sebastian", "Emily", "Michael", "Elizabeth", "Owen",
  "Sofia", "Ryan", "Avery", "Nathan", "Ella", "Jacob", "Madison", "Jack",
  "Scarlett", "Samuel", "Victoria", "Daniel", "Aria", "David", "Grace",
  "Joseph", "Chloe", "Carter", "Penelope", "Luke", "Layla", "Henry", "Riley",
  "Dylan", "Zoey", "Andrew", "Nora", "Liam", "Lily", "Noah", "Hannah",
  "Alexander", "Lillian", "Elijah", "Addison", "Joshua", "Aubrey", "Connor",
  "Stella", "Cameron", "Aurora", "Adrian", "Savannah", "Aaron", "Brooklyn",
] as const;

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia",
  "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez",
  "Moore", "Martin", "Jackson", "Thompson", "White", "Lopez", "Lee", "Gonzalez",
  "Harris", "Clark", "Lewis", "Robinson", "Walker", "Perez", "Hall", "Young",
  "Allen", "Sanchez", "Wright", "King", "Scott", "Green", "Baker", "Adams",
  "Nelson", "Hill", "Ramirez", "Campbell", "Mitchell", "Roberts", "Carter",
  "Phillips", "Evans", "Turner", "Torres", "Parker", "Collins", "Edwards",
  "Stewart", "Flores", "Morris", "Nguyen", "Murphy", "Rivera", "Cook", "Morgan",
] as const;

const CAR_POOL = [
  { make: "BMW",        model: "M3 Competition",          yearRange: [2019, 2024] as [number,number], powerHp: 510, weightKg: 1730, class: "Street Modified"  as const },
  { make: "BMW",        model: "M4 CSL",                  yearRange: [2022, 2024] as [number,number], powerHp: 543, weightKg: 1625, class: "Track Prepared"   as const },
  { make: "BMW",        model: "M240i",                   yearRange: [2021, 2024] as [number,number], powerHp: 374, weightKg: 1615, class: "Street"           as const },
  { make: "Porsche",    model: "911 GT3",                 yearRange: [2018, 2024] as [number,number], powerHp: 510, weightKg: 1430, class: "Track Prepared"   as const },
  { make: "Porsche",    model: "Cayman GT4",              yearRange: [2019, 2024] as [number,number], powerHp: 420, weightKg: 1420, class: "Track Prepared"   as const },
  { make: "Porsche",    model: "718 Boxster S",           yearRange: [2016, 2024] as [number,number], powerHp: 350, weightKg: 1395, class: "Street"           as const },
  { make: "Honda",      model: "Civic Type R",            yearRange: [2020, 2024] as [number,number], powerHp: 329, weightKg: 1400, class: "Street"           as const },
  { make: "Toyota",     model: "GR86",                    yearRange: [2021, 2024] as [number,number], powerHp: 234, weightKg: 1270, class: "Street"           as const },
  { make: "Toyota",     model: "GR Yaris",                yearRange: [2020, 2024] as [number,number], powerHp: 261, weightKg: 1280, class: "Street Modified"  as const },
  { make: "Toyota",     model: "Supra GR A90",            yearRange: [2019, 2024] as [number,number], powerHp: 387, weightKg: 1570, class: "Street Modified"  as const },
  { make: "Renault",    model: "Mégane RS Trophy-R",      yearRange: [2019, 2023] as [number,number], powerHp: 300, weightKg: 1306, class: "Street Modified"  as const },
  { make: "Renault",    model: "Clio RS Cup",             yearRange: [2017, 2022] as [number,number], powerHp: 220, weightKg: 1230, class: "Street"           as const },
  { make: "Lotus",      model: "Elise S3",                yearRange: [2015, 2021] as [number,number], powerHp: 220, weightKg:  926, class: "Track Prepared"   as const },
  { make: "Caterham",   model: "Seven 310R",              yearRange: [2016, 2024] as [number,number], powerHp: 160, weightKg:  490, class: "Track Prepared"   as const },
  { make: "Caterham",   model: "Seven 420R",              yearRange: [2016, 2024] as [number,number], powerHp: 210, weightKg:  500, class: "Track Prepared"   as const },
  { make: "Ferrari",    model: "488 GTB",                 yearRange: [2016, 2021] as [number,number], powerHp: 660, weightKg: 1475, class: "Street Modified"  as const },
  { make: "Ferrari",    model: "488 Challenge",           yearRange: [2017, 2022] as [number,number], powerHp: 670, weightKg: 1260, class: "Race"             as const },
  { make: "Lamborghini",model: "Huracán LP610-4",         yearRange: [2015, 2020] as [number,number], powerHp: 610, weightKg: 1422, class: "Street Modified"  as const },
  { make: "Ford",       model: "Mustang Shelby GT350R",   yearRange: [2016, 2020] as [number,number], powerHp: 526, weightKg: 1585, class: "Street Modified"  as const },
  { make: "Ford",       model: "Focus RS",                yearRange: [2016, 2019] as [number,number], powerHp: 350, weightKg: 1496, class: "Street Modified"  as const },
  { make: "Subaru",     model: "BRZ",                     yearRange: [2021, 2024] as [number,number], powerHp: 234, weightKg: 1270, class: "Street"           as const },
  { make: "Mazda",      model: "MX-5 ND",                 yearRange: [2015, 2024] as [number,number], powerHp: 184, weightKg: 1050, class: "Street"           as const },
  { make: "Alfa Romeo", model: "Giulia Quadrifoglio",     yearRange: [2019, 2024] as [number,number], powerHp: 510, weightKg: 1524, class: "Street Modified"  as const },
  { make: "Mercedes",   model: "AMG GT4",                 yearRange: [2017, 2023] as [number,number], powerHp: 510, weightKg: 1415, class: "Race"             as const },
  { make: "Audi",       model: "R8 LMS GT4",              yearRange: [2017, 2023] as [number,number], powerHp: 495, weightKg: 1420, class: "Race"             as const },
  { make: "Audi",       model: "RS3 Sportback",           yearRange: [2021, 2024] as [number,number], powerHp: 400, weightKg: 1570, class: "Street Modified"  as const },
  { make: "SEAT",       model: "León Cupra R",            yearRange: [2017, 2021] as [number,number], powerHp: 310, weightKg: 1350, class: "Street Modified"  as const },
  { make: "Volkswagen", model: "Golf GTI Clubsport S",    yearRange: [2016, 2021] as [number,number], powerHp: 310, weightKg: 1290, class: "Street Modified"  as const },
  { make: "Volkswagen", model: "Golf R",                  yearRange: [2020, 2024] as [number,number], powerHp: 333, weightKg: 1521, class: "Street"           as const },
  { make: "Nissan",     model: "GT-R R35",                yearRange: [2015, 2022] as [number,number], powerHp: 570, weightKg: 1752, class: "Street Modified"  as const },
];

// Base lap time in ms and max positive spread per track
const TRACK_TIMES: Record<string, { base: number; spread: number }> = {
  "Nürburgring Nordschleife": { base: 495_000, spread: 120_000 },
  "Spa-Francorchamps":        { base: 138_000, spread:  42_000 },
  "Silverstone GP":           { base: 115_000, spread:  30_000 },
  "Monza":                    { base:  98_000, spread:  28_000 },
  "Brands Hatch GP":          { base:  88_000, spread:  26_000 },
};

// Sector splits: [s1%, s2%] — s3 = remainder
const SECTOR_SPLIT = [0.31, 0.41]; // s3 ≈ 0.28

const CONDITIONS = ["dry", "dry", "dry", "dry", "wet", "damp"] as const;

const NUM_BULK_USERS  = 200;
const CARS_PER_USER   = 2;
const LAPS_PER_USER   = 52;   // 200 × 52 = 10,400 laps
const NUM_EVENTS      = 50;

// ── Main ──────────────────────────────────────────────────────────────────────

async function seedBulk() {
  console.log("Bulk seeding database…\n");

  // ── Fetch existing tracks ─────────────────────────────────────────────────
  const tracks = await db.select().from(schema.tracks);
  if (tracks.length === 0) {
    console.error("No tracks found. Run `npm run db:seed` first.");
    process.exit(1);
  }
  console.log(`✓ Found ${tracks.length} tracks`);

  // ── Fetch or create admin user for events ─────────────────────────────────
  const adminRows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "admin"))
    .limit(1);
  const organiserId = adminRows[0]?.id;
  if (!organiserId) {
    console.error("No admin user found. Run `npm run db:seed` first and promote a user.");
    process.exit(1);
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  const pw = hashSync("Password123!", 10);
  const userValues: (typeof schema.users.$inferInsert)[] = [];
  const usedEmails = new Set<string>();

  for (let i = 0; i < NUM_BULK_USERS; i++) {
    const first = pick(FIRST_NAMES);
    const last  = pick(LAST_NAMES);
    let email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@bulk.lapvault.dev`;
    while (usedEmails.has(email)) {
      email = `${first.toLowerCase()}.${last.toLowerCase()}${i}_${rand(1, 999)}@bulk.lapvault.dev`;
    }
    usedEmails.add(email);
    userValues.push({ name: `${first} ${last}`, email, passwordHash: pw, role: "user" });
  }

  await insertBatches("users", userValues, 50, async (batch) => {
    await db.insert(schema.users).values(batch).onConflictDoNothing();
  });

  // Fetch back the inserted users by email domain
  const bulkUsers = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, userValues[0].email))
    .limit(1)
    .then(async () => {
      // Re-fetch all bulk users
      const all = await db.select().from(schema.users);
      return all.filter((u) => u.email.endsWith("@bulk.lapvault.dev"));
    });
  console.log(`✓ ${bulkUsers.length} bulk users`);

  // ── Cars ──────────────────────────────────────────────────────────────────
  const carValues: (typeof schema.cars.$inferInsert)[] = [];
  for (const user of bulkUsers) {
    for (let c = 0; c < CARS_PER_USER; c++) {
      const car = pick(CAR_POOL);
      carValues.push({
        ownerId:  user.id,
        make:     car.make,
        model:    car.model,
        year:     rand(car.yearRange[0], car.yearRange[1]),
        powerHp:  car.powerHp + rand(-20, 20),
        weightKg: car.weightKg + rand(-30, 30),
        class:    car.class,
      });
    }
  }

  const insertedCars: { id: number; ownerId: number }[] = [];
  await insertBatches("cars", carValues, 100, async (batch) => {
    const rows = await db.insert(schema.cars).values(batch).returning({ id: schema.cars.id, ownerId: schema.cars.ownerId });
    insertedCars.push(...rows);
  });
  console.log(`✓ ${insertedCars.length} cars`);

  // Group cars by owner for lap generation
  const carsByUser: Record<number, number[]> = {};
  for (const car of insertedCars) {
    if (!carsByUser[car.ownerId]) carsByUser[car.ownerId] = [];
    carsByUser[car.ownerId].push(car.id);
  }

  // ── Laps ──────────────────────────────────────────────────────────────────
  const lapValues: (typeof schema.laps.$inferInsert)[] = [];

  for (const user of bulkUsers) {
    const userCars = carsByUser[user.id] ?? [];
    if (userCars.length === 0) continue;

    // Each user laps at 2-3 tracks (random subset)
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    const userTracks = shuffled.slice(0, rand(2, 3));

    const lapsPerTrack = Math.ceil(LAPS_PER_USER / userTracks.length);

    for (const track of userTracks) {
      const timing = TRACK_TIMES[track.name] ?? { base: 120_000, spread: 30_000 };

      // Establish a personal baseline for this user/track combo (skill level)
      const personalBase = timing.base + rand(0, timing.spread);

      for (let l = 0; l < lapsPerTrack; l++) {
        const carId = pick(userCars);
        const condition = pick(CONDITIONS);
        const wetPenalty = condition === "wet" ? rand(3000, 8000) : condition === "damp" ? rand(1000, 3000) : 0;

        // Small improvement over sessions (simulates learning)
        const improvement = Math.floor((lapsPerTrack - l) * rand(50, 200));
        const lapTimeMs = Math.max(timing.base - 5000, personalBase - improvement + rand(-1500, 1500) + wetPenalty);

        const s1 = Math.floor(lapTimeMs * (SECTOR_SPLIT[0] + (Math.random() - 0.5) * 0.02));
        const s2 = Math.floor(lapTimeMs * (SECTOR_SPLIT[1] + (Math.random() - 0.5) * 0.02));
        const s3 = lapTimeMs - s1 - s2;

        lapValues.push({
          userId:    user.id,
          trackId:   track.id,
          carId,
          lapTimeMs,
          sector1Ms: s1,
          sector2Ms: s2,
          sector3Ms: s3,
          conditions: condition,
          createdAt: daysAgo(rand(1, 730)),
        });
      }
    }
  }

  await insertBatches("laps", lapValues, 500, async (batch) => {
    await db.insert(schema.laps).values(batch);
  });
  console.log(`✓ ${lapValues.length} laps`);

  // ── Events ────────────────────────────────────────────────────────────────
  const eventTitles = [
    "Open Pitlane Day", "Track Experience", "Club Sprint", "Supercar Sunday",
    "Trackday Masters", "Winter Warm-Up", "Summer Blast", "Autumn Classic",
    "Novice Day", "Advanced Session", "Night Laps", "Endurance Challenge",
    "Championship Round", "Speed Festival", "Time Attack",
  ];

  const eventValues: (typeof schema.events.$inferInsert)[] = [];
  for (let i = 0; i < NUM_EVENTS; i++) {
    const track = pick(tracks);
    const isPast = i < NUM_EVENTS * 0.6;
    const date = isPast ? daysAgo(rand(5, 365)) : daysFromNow(rand(7, 180));
    eventValues.push({
      trackId:         track.id,
      createdBy:       organiserId,
      title:           `${pick(eventTitles)} — ${track.name.split(" ")[0]}`,
      date,
      maxParticipants: pick([20, 25, 30, 35, 40, 50, null]),
      allowedClasses:  pick([null, null, ["Street", "Street Modified"], ["Track Prepared", "Race"]]),
      description:     `Bulk seeded event at ${track.name}.`,
    });
  }

  const insertedEvents: { id: number }[] = [];
  await insertBatches("events", eventValues, 50, async (batch) => {
    const rows = await db.insert(schema.events).values(batch).returning({ id: schema.events.id });
    insertedEvents.push(...rows);
  });
  console.log(`✓ ${insertedEvents.length} events`);

  // ── Registrations ─────────────────────────────────────────────────────────
  // Register ~6 bulk users per event
  const regValues: (typeof schema.eventRegistrations.$inferInsert)[] = [];
  const regSet = new Set<string>(); // prevent duplicate (eventId, userId) pairs

  for (const event of insertedEvents) {
    const participants = [...bulkUsers].sort(() => Math.random() - 0.5).slice(0, rand(3, 8));
    for (const user of participants) {
      const key = `${event.id}:${user.id}`;
      if (regSet.has(key)) continue;
      regSet.add(key);
      const userCars = carsByUser[user.id] ?? [];
      if (userCars.length === 0) continue;
      regValues.push({
        eventId: event.id,
        userId:  user.id,
        carId:   pick(userCars),
        status:  pick(["confirmed", "confirmed", "confirmed", "pending", "cancelled"]),
      });
    }
  }

  await insertBatches("registrations", regValues, 200, async (batch) => {
    await db.insert(schema.eventRegistrations).values(batch);
  });
  console.log(`✓ ${regValues.length} registrations`);

  console.log(`\nDone! Total laps in DB will exceed 10,000.`);
}

seedBulk().catch((err) => {
  console.error(err);
  process.exit(1);
});
