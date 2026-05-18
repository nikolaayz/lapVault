import { pgTable, serial, text, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const carClassEnum = pgEnum("car_class", ["Street", "Street Modified", "Track Prepared", "Race"]);
export const conditionsEnum = pgEnum("conditions", ["dry", "wet", "damp"]);
export const registrationStatusEnum = pgEnum("registration_status", ["pending", "confirmed", "cancelled"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("user"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cars = pgTable("cars", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  powerHp: integer("power_hp"),
  weightKg: integer("weight_kg"),
  class: carClassEnum("class").notNull(),
  modifications: text("modifications"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("cars_owner_id_idx").on(table.ownerId),
]);

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  lengthKm: text("length_km"),
  photoUrl: text("photo_url"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  createdBy: integer("created_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  maxParticipants: integer("max_participants"),
  allowedClasses: text("allowed_classes").array(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("events_date_idx").on(table.date),
  index("events_track_id_idx").on(table.trackId),
]);

export const eventRegistrations = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  carId: integer("car_id").notNull().references(() => cars.id),
  status: registrationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("event_registrations_user_id_idx").on(table.userId),
  index("event_registrations_event_id_idx").on(table.eventId),
]);

export const laps = pgTable("laps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  trackId: integer("track_id").notNull().references(() => tracks.id),
  eventId: integer("event_id").references(() => events.id),
  carId: integer("car_id").notNull().references(() => cars.id),
  lapTimeMs: integer("lap_time_ms").notNull(),
  sector1Ms: integer("sector1_ms"),
  sector2Ms: integer("sector2_ms"),
  sector3Ms: integer("sector3_ms"),
  conditions: conditionsEnum("conditions").notNull().default("dry"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("laps_user_id_idx").on(table.userId),
  index("laps_track_id_lap_time_idx").on(table.trackId, table.lapTimeMs),
]);
