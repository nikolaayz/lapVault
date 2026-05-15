import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hashSync } from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import * as schema from "./lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

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

async function seed() {
  console.log("Seeding database...\n");

  // ── Tracks ───────────────────────────────────────────────────────────────
  const trackRows = await db
    .insert(schema.tracks)
    .values([
      { name: "Nürburgring Nordschleife", country: "Germany",        lengthKm: "20.8" },
      { name: "Spa-Francorchamps",        country: "Belgium",         lengthKm: "7.0"  },
      { name: "Silverstone GP",           country: "United Kingdom",  lengthKm: "5.9"  },
      { name: "Monza",                    country: "Italy",           lengthKm: "5.8"  },
      { name: "Brands Hatch GP",          country: "United Kingdom",  lengthKm: "3.9"  },
    ])
    .returning();
  const [nbr, spa, silverstone, monza, brands] = trackRows;
  console.log(`✓ ${trackRows.length} tracks`);

  // ── Users ────────────────────────────────────────────────────────────────
  const pw = hashSync("Password123!", 10);
  const seedEmails = ["alex@lapvault.dev", "sarah@lapvault.dev", "marco@lapvault.dev", "jamie@lapvault.dev"];

  await db
    .insert(schema.users)
    .values([
      { name: "Alex Turner",  email: seedEmails[0], passwordHash: pw, role: "user" },
      { name: "Sarah Chen",   email: seedEmails[1], passwordHash: pw, role: "user" },
      { name: "Marco Rossi",  email: seedEmails[2], passwordHash: pw, role: "user" },
      { name: "Jamie Wilson", email: seedEmails[3], passwordHash: pw, role: "user" },
    ])
    .onConflictDoNothing();

  const userRows = await db
    .select()
    .from(schema.users)
    .where(inArray(schema.users.email, seedEmails));

  const byEmail = Object.fromEntries(userRows.map((u) => [u.email, u]));
  const alex  = byEmail["alex@lapvault.dev"];
  const sarah = byEmail["sarah@lapvault.dev"];
  const marco = byEmail["marco@lapvault.dev"];
  const jamie = byEmail["jamie@lapvault.dev"];
  console.log(`✓ ${userRows.length} seed users`);

  // ── Cars ─────────────────────────────────────────────────────────────────
  const carRows = await db
    .insert(schema.cars)
    .values([
      // Alex — two cars
      { ownerId: alex.id,  make: "BMW",       model: "M3 Competition",  year: 2022, powerHp: 510, weightKg: 1730, class: "Street Modified", modifications: "Michelin Cup 2R tyres, brake pads" },
      { ownerId: alex.id,  make: "Porsche",   model: "911 GT3",          year: 2019, powerHp: 500, weightKg: 1430, class: "Track Prepared",  modifications: "Roll cage, harness, fire suppression" },
      // Sarah
      { ownerId: sarah.id, make: "Honda",     model: "Civic Type R",     year: 2023, powerHp: 329, weightKg: 1400, class: "Street",          modifications: null },
      { ownerId: sarah.id, make: "Lotus",     model: "Elise S2",         year: 2008, powerHp: 192, weightKg: 726,  class: "Track Prepared",  modifications: "Harness, stripped interior, Toyo R888" },
      // Marco
      { ownerId: marco.id, make: "Ferrari",   model: "488 Challenge",    year: 2020, powerHp: 670, weightKg: 1260, class: "Race",            modifications: "Full FIA spec race car" },
      { ownerId: marco.id, make: "Alfa Romeo",model: "Giulia Quadrifoglio", year: 2021, powerHp: 510, weightKg: 1524, class: "Street Modified", modifications: "Akrapovic exhaust, camber arms" },
      // Jamie
      { ownerId: jamie.id, make: "Subaru",    model: "BRZ",              year: 2022, powerHp: 234, weightKg: 1270, class: "Street",          modifications: null },
      { ownerId: jamie.id, make: "Caterham",  model: "Seven 420R",       year: 2017, powerHp: 210, weightKg: 500,  class: "Track Prepared",  modifications: "OEM track spec" },
    ])
    .returning();

  const [alexM3, alexGT3, sarahCivic, sarahElise, marcoFerrari, marcoAlfa, jamieBRZ, jamieCaterham] = carRows;
  console.log(`✓ ${carRows.length} cars`);

  // ── Laps ─────────────────────────────────────────────────────────────────
  // Realistic lap times in ms
  const lapsData: (typeof schema.laps.$inferInsert)[] = [
    // Alex – BMW M3 – Nordschleife
    { userId: alex.id,  trackId: nbr.id,         carId: alexM3.id,       lapTimeMs: 497_412, sector1Ms: 158_200, sector2Ms: 203_100, sector3Ms: 136_112, conditions: "dry",  notes: "First proper lap, very happy with consistency.", createdAt: daysAgo(60) },
    { userId: alex.id,  trackId: nbr.id,         carId: alexM3.id,       lapTimeMs: 489_880, sector1Ms: 156_100, sector2Ms: 199_800, sector3Ms: 133_980, conditions: "dry",  notes: "Improved S1, still leaving time in Kesselchen.",  createdAt: daysAgo(45) },
    { userId: alex.id,  trackId: nbr.id,         carId: alexM3.id,       lapTimeMs: 483_220, sector1Ms: 153_800, sector2Ms: 197_500, sector3Ms: 131_920, conditions: "dry",  createdAt: daysAgo(20) },
    // Alex – GT3 – Spa
    { userId: alex.id,  trackId: spa.id,         carId: alexGT3.id,      lapTimeMs: 143_560, sector1Ms: 46_200,  sector2Ms: 58_900,  sector3Ms: 38_460,  conditions: "dry",  createdAt: daysAgo(55) },
    { userId: alex.id,  trackId: spa.id,         carId: alexGT3.id,      lapTimeMs: 141_230, sector1Ms: 45_400,  sector2Ms: 57_700,  sector3Ms: 38_130,  conditions: "dry",  notes: "PB at Spa, Eau Rouge felt perfect.",               createdAt: daysAgo(30) },
    { userId: alex.id,  trackId: spa.id,         carId: alexGT3.id,      lapTimeMs: 148_900, sector1Ms: 47_200,  sector2Ms: 60_100,  sector3Ms: 41_600,  conditions: "wet",  notes: "Wet session, rear came around at Pouhon.",         createdAt: daysAgo(10) },
    // Alex – M3 – Silverstone
    { userId: alex.id,  trackId: silverstone.id, carId: alexM3.id,       lapTimeMs: 118_440, sector1Ms: 38_200,  sector2Ms: 47_900,  sector3Ms: 32_340,  conditions: "dry",  createdAt: daysAgo(70) },
    { userId: alex.id,  trackId: silverstone.id, carId: alexM3.id,       lapTimeMs: 115_880, sector1Ms: 37_100,  sector2Ms: 46_800,  sector3Ms: 31_980,  conditions: "dry",  createdAt: daysAgo(35) },

    // Sarah – Civic – Brands Hatch
    { userId: sarah.id, trackId: brands.id,      carId: sarahCivic.id,   lapTimeMs: 105_340, sector1Ms: 33_100,  sector2Ms: 42_800,  sector3Ms: 29_440,  conditions: "dry",  createdAt: daysAgo(50) },
    { userId: sarah.id, trackId: brands.id,      carId: sarahCivic.id,   lapTimeMs: 103_780, sector1Ms: 32_600,  sector2Ms: 42_200,  sector3Ms: 28_980,  conditions: "dry",  notes: "Managed the tyre deg much better.",                createdAt: daysAgo(25) },
    { userId: sarah.id, trackId: brands.id,      carId: sarahCivic.id,   lapTimeMs: 101_990, sector1Ms: 32_000,  sector2Ms: 41_500,  sector3Ms: 28_490,  conditions: "dry",  notes: "PB! Finally broke 1:42.",                          createdAt: daysAgo(5)  },
    // Sarah – Elise – Silverstone
    { userId: sarah.id, trackId: silverstone.id, carId: sarahElise.id,   lapTimeMs: 112_660, sector1Ms: 36_100,  sector2Ms: 45_600,  sector3Ms: 30_960,  conditions: "dry",  createdAt: daysAgo(40) },
    { userId: sarah.id, trackId: silverstone.id, carId: sarahElise.id,   lapTimeMs: 110_230, sector1Ms: 35_400,  sector2Ms: 44_800,  sector3Ms: 30_030,  conditions: "dry",  createdAt: daysAgo(15) },
    // Sarah – Elise – Monza
    { userId: sarah.id, trackId: monza.id,       carId: sarahElise.id,   lapTimeMs: 108_440, sector1Ms: 34_700,  sector2Ms: 44_200,  sector3Ms: 29_540,  conditions: "dry",  createdAt: daysAgo(80) },

    // Marco – Ferrari – Monza
    { userId: marco.id, trackId: monza.id,       carId: marcoFerrari.id, lapTimeMs: 100_120, sector1Ms: 31_800,  sector2Ms: 41_200,  sector3Ms: 27_120,  conditions: "dry",  notes: "Race pace, fuel load.",                            createdAt: daysAgo(65) },
    { userId: marco.id, trackId: monza.id,       carId: marcoFerrari.id, lapTimeMs:  97_880, sector1Ms: 31_100,  sector2Ms: 40_300,  sector3Ms: 26_480,  conditions: "dry",  notes: "Quali sim, light fuel. 1:37 in sight.",            createdAt: daysAgo(32) },
    { userId: marco.id, trackId: monza.id,       carId: marcoFerrari.id, lapTimeMs:  96_440, sector1Ms: 30_600,  sector2Ms: 39_800,  sector3Ms: 26_040,  conditions: "dry",  notes: "PB! Just pipped it on the last lap.",              createdAt: daysAgo(8)  },
    // Marco – Ferrari – Spa
    { userId: marco.id, trackId: spa.id,         carId: marcoFerrari.id, lapTimeMs: 132_110, sector1Ms: 42_400,  sector2Ms: 54_200,  sector3Ms: 35_510,  conditions: "dry",  createdAt: daysAgo(58) },
    { userId: marco.id, trackId: spa.id,         carId: marcoFerrari.id, lapTimeMs: 129_440, sector1Ms: 41_600,  sector2Ms: 52_800,  sector3Ms: 35_040,  conditions: "dry",  createdAt: daysAgo(22) },
    // Marco – Alfa – Nordschleife
    { userId: marco.id, trackId: nbr.id,         carId: marcoAlfa.id,    lapTimeMs: 512_780, sector1Ms: 163_400, sector2Ms: 209_600, sector3Ms: 139_780, conditions: "dry",  createdAt: daysAgo(75) },

    // Jamie – BRZ – Brands Hatch
    { userId: jamie.id, trackId: brands.id,      carId: jamieBRZ.id,     lapTimeMs: 110_560, sector1Ms: 34_800,  sector2Ms: 45_100,  sector3Ms: 30_660,  conditions: "dry",  createdAt: daysAgo(48) },
    { userId: jamie.id, trackId: brands.id,      carId: jamieBRZ.id,     lapTimeMs: 108_990, sector1Ms: 34_200,  sector2Ms: 44_500,  sector3Ms: 30_290,  conditions: "damp", notes: "Damp track, surprised by the grip.",               createdAt: daysAgo(20) },
    // Jamie – Caterham – Brands Hatch
    { userId: jamie.id, trackId: brands.id,      carId: jamieCaterham.id,lapTimeMs:  91_230, sector1Ms: 28_700,  sector2Ms: 37_400,  sector3Ms: 25_130,  conditions: "dry",  notes: "Caterham is a different world.",                   createdAt: daysAgo(35) },
    { userId: jamie.id, trackId: brands.id,      carId: jamieCaterham.id,lapTimeMs:  89_660, sector1Ms: 28_200,  sector2Ms: 36_800,  sector3Ms: 24_660,  conditions: "dry",  notes: "PB. Could go quicker with better track position.",  createdAt: daysAgo(12) },
    // Jamie – Caterham – Silverstone
    { userId: jamie.id, trackId: silverstone.id, carId: jamieCaterham.id,lapTimeMs: 107_440, sector1Ms: 34_400,  sector2Ms: 43_800,  sector3Ms: 29_240,  conditions: "dry",  createdAt: daysAgo(55) },
  ];

  await db.insert(schema.laps).values(lapsData);
  console.log(`✓ ${lapsData.length} laps`);

  // ── Events ───────────────────────────────────────────────────────────────
  // Admin user to create events — use Marco as organiser (or first admin found)
  const adminRows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "admin"))
    .limit(1);

  const organiserId = adminRows[0]?.id ?? alex.id;

  const eventRows = await db
    .insert(schema.events)
    .values([
      // Past
      {
        trackId: spa.id, createdBy: organiserId,
        title: "Spring Sprint — Spa",
        date: daysAgo(40),
        maxParticipants: 30,
        allowedClasses: null,
        description: "Open-pit, two 20-min sessions per driver. All classes welcome.",
      },
      {
        trackId: brands.id, createdBy: organiserId,
        title: "Brands Hatch Club Day",
        date: daysAgo(18),
        maxParticipants: 40,
        allowedClasses: ["Street", "Street Modified"],
        description: "Novice-friendly day on the Indy circuit. Street cars only.",
      },
      // Upcoming
      {
        trackId: silverstone.id, createdBy: organiserId,
        title: "Silverstone Summer Blast",
        date: daysFromNow(14),
        maxParticipants: 35,
        allowedClasses: null,
        description: "Full GP layout. Three groups by pace. Breakfast included.",
      },
      {
        trackId: monza.id, createdBy: organiserId,
        title: "Monza Trackday — July",
        date: daysFromNow(28),
        maxParticipants: 25,
        allowedClasses: ["Track Prepared", "Race"],
        description: "For the serious drivers. Track Prepared and Race classes only.",
      },
      {
        trackId: nbr.id, createdBy: organiserId,
        title: "Nordschleife Touristenfahrten",
        date: daysFromNow(45),
        maxParticipants: null,
        allowedClasses: null,
        description: "Public lapping session. All cars subject to technical inspection.",
      },
      {
        trackId: spa.id, createdBy: organiserId,
        title: "Spa Autumn Classic",
        date: daysFromNow(90),
        maxParticipants: 50,
        allowedClasses: null,
        description: "Season closer at Spa. Afternoon social and prize giving included.",
      },
    ])
    .returning();

  const [pastSpa, pastBrands, upcomingSilverstone, upcomingMonza, upcomingNbr, upcomingSpa] = eventRows;
  console.log(`✓ ${eventRows.length} events`);

  // ── Registrations ─────────────────────────────────────────────────────────
  await db.insert(schema.eventRegistrations).values([
    // Past Spa — multiple drivers
    { eventId: pastSpa.id,          userId: alex.id,   carId: alexGT3.id,       status: "confirmed" },
    { eventId: pastSpa.id,          userId: marco.id,  carId: marcoFerrari.id,  status: "confirmed" },
    { eventId: pastSpa.id,          userId: sarah.id,  carId: sarahElise.id,    status: "confirmed" },
    // Past Brands Hatch
    { eventId: pastBrands.id,       userId: sarah.id,  carId: sarahCivic.id,    status: "confirmed" },
    { eventId: pastBrands.id,       userId: jamie.id,  carId: jamieBRZ.id,      status: "confirmed" },
    // Upcoming Silverstone
    { eventId: upcomingSilverstone.id, userId: alex.id,  carId: alexM3.id,       status: "confirmed" },
    { eventId: upcomingSilverstone.id, userId: sarah.id, carId: sarahElise.id,   status: "confirmed" },
    { eventId: upcomingSilverstone.id, userId: jamie.id, carId: jamieCaterham.id,status: "confirmed" },
    // Upcoming Monza (Track Prepared + Race only)
    { eventId: upcomingMonza.id,    userId: marco.id,  carId: marcoFerrari.id,  status: "confirmed" },
    { eventId: upcomingMonza.id,    userId: sarah.id,  carId: sarahElise.id,    status: "confirmed" },
    // Upcoming Nordschleife
    { eventId: upcomingNbr.id,      userId: alex.id,   carId: alexM3.id,        status: "confirmed" },
    { eventId: upcomingNbr.id,      userId: marco.id,  carId: marcoAlfa.id,     status: "confirmed" },
  ]);
  console.log(`✓ 12 registrations`);

  console.log("\nDone! Seed users (password: Password123!):");
  console.log("  alex@lapvault.dev");
  console.log("  sarah@lapvault.dev");
  console.log("  marco@lapvault.dev");
  console.log("  jamie@lapvault.dev");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
