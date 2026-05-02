# AGENTS.md — LapVault

## Project Overview

**LapVault** is a web + mobile application for motorsport enthusiasts who attend track days at racing circuits. Users can log their lap times, manage their cars, register for organized events, and compete on leaderboards — all separated by car class for fair competition.

### Who can do what

| Role | Permissions |
|---|---|
| **Guest** | View public tracks, public leaderboards |
| **User** | Register/login, manage cars, log laps, register for events |
| **Admin** | All of the above + manage tracks, create events, manage users |

---

## Architecture

### Monorepo Structure

```
lapvault/
├── apps/
│   ├── web/                  ← Next.js app (frontend + backend API)
│   │   ├── app/              ← Next.js App Router pages
│   │   │   ├── (auth)/       ← login, register pages
│   │   │   ├── (app)/        ← protected app pages
│   │   │   └── api/          ← REST API routes
│   │   ├── components/       ← React components
│   │   └── lib/              ← utilities, auth, storage
│   └── mobile/               ← Expo React Native app
│       ├── app/              ← Expo Router screens
│       └── components/       ← React Native components
├── packages/
│   └── db/                   ← Drizzle schema + migrations
│       ├── schema.ts
│       └── migrations/
├── package.json              ← root workspace config
└── AGENTS.md
```

### Client-Server Communication

```
Web Browser  ──────────────────────────────► Next.js App (Vercel)
                     HTTP REST API                    │
Mobile App   ──────────────────────────────►          │
(Expo)                                                │
                                                      ▼
                                             Neon PostgreSQL DB
                                             Cloudflare R2 (files)
```

---

## Technologies

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (App Router) |
| **Database** | Neon serverless PostgreSQL |
| **ORM** | Drizzle ORM + Drizzle Kit (migrations) |
| **Auth** | JWT tokens (jose library) |
| **File Storage** | Cloudflare R2 |
| **Mobile** | React Native + Expo (Expo Router) |
| **Deployment** | Vercel (web) + Expo Go / EAS (mobile) |
| **Package Manager** | pnpm workspaces |

---

## Database Schema

### Tables

#### `users`
```sql
id, name, email, password_hash, role (user | admin), created_at
```

#### `cars`
```sql
id, owner_id (→ users), make, model, year, power_hp, weight_kg,
class (Street | Street Modified | Track Prepared | Race),
modifications (text), photo_url, created_at
```

#### `tracks`
```sql
id, name, country, length_km, photo_url, description, created_at
```

#### `events`
```sql
id, track_id (→ tracks), created_by (→ users), title, date,
max_participants, allowed_classes (array), description, created_at
```

#### `event_registrations`
```sql
id, event_id (→ events), user_id (→ users), car_id (→ cars),
status (pending | confirmed | cancelled), created_at
```

#### `laps`
```sql
id, user_id (→ users), track_id (→ tracks), event_id (→ events, nullable),
car_id (→ cars), lap_time_ms, sector1_ms, sector2_ms, sector3_ms,
conditions (dry | wet | damp), notes, created_at
```

### Car Classes

| Class | Description |
|---|---|
| `Street` | Stock car, no modifications |
| `Street Modified` | Minor mods — tires, brakes, exhaust, coilovers |
| `Track Prepared` | Major mods — rollcage, slick tires, engine work |
| `Race` | Full race cars — Porsche Cup, Formula, etc. |

---

## API Endpoints

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Cars
```
GET    /api/cars              ← user's cars
POST   /api/cars              ← add car
PUT    /api/cars/[id]         ← edit car
DELETE /api/cars/[id]         ← delete car
```

### Tracks
```
GET  /api/tracks              ← all tracks (public)
GET  /api/tracks/[id]         ← track details + leaderboard
POST /api/tracks              ← admin only
PUT  /api/tracks/[id]         ← admin only
```

### Events
```
GET  /api/events              ← upcoming events
GET  /api/events/[id]         ← event details + registrations
POST /api/events              ← admin only
POST /api/events/[id]/register   ← register for event
DELETE /api/events/[id]/register ← cancel registration
```

### Laps
```
GET  /api/laps                ← user's lap times
POST /api/laps                ← log new lap
GET  /api/laps/best?trackId=  ← personal best per track
```

### Admin
```
GET  /api/admin/users         ← all users
PUT  /api/admin/users/[id]    ← change role
GET  /api/admin/stats         ← app statistics
```

---

## Web App Screens

1. **`/login` & `/register`** — JWT auth forms
2. **`/dashboard`** — upcoming events, recent laps, personal bests
3. **`/tracks`** — catalog of all tracks with photos
4. **`/tracks/[id]`** — track details, leaderboard by class, upcoming events
5. **`/garage`** — user's cars, add/edit/delete with photo upload
6. **`/laps`** — lap history, possible best calculation (S1+S2+S3)
7. **`/admin`** — manage tracks, events, users (admin role only)

---

## Mobile App Screens (Expo)

1. **Login** — JWT auth
2. **Events** — list of upcoming events, register button
3. **My Times** — quick lap entry form + personal best display

---

## Key Business Logic

### Possible Best Calculation
```
possible_best = best_sector1 + best_sector2 + best_sector3
(across all clean laps on a given track with a given car)
```

### Leaderboard Rules
- Separate leaderboard per car class
- Only the **best lap** per user per car class is shown
- Overall leaderboard shows absolute fastest regardless of class

### Event Registration
- User selects which car to bring
- Car class must match `allowed_classes` of the event
- Max participants limit enforced server-side

---

## Authentication & Authorization

- JWT stored in **httpOnly cookie**
- Token contains: `userId`, `role`, `exp`
- All `/api/*` routes validate JWT on every request
- Admin routes check `role === 'admin'`
- Users can only edit/delete their own resources

---

## File Storage (Cloudflare R2)

- Car photos: `cars/{userId}/{carId}.jpg`
- Track photos: `tracks/{trackId}.jpg`
- Upload via signed URL from `/api/upload` endpoint
- Store only the R2 public URL in the database

---

## Development Guidelines

- Always use **Drizzle migrations** when changing DB schema (`pnpm db:generate && pnpm db:migrate`)
- Commit migration SQL files to GitHub
- Validate all user input server-side (never trust the client)
- Use **TypeScript** everywhere — no `any` types
- Keep API routes thin — business logic in `/lib` files
- Mobile app communicates with the **same Next.js API** as the web app
- Use environment variables for all secrets (`.env.local`)

---

## Environment Variables

```env
# Database
DATABASE_URL=

# Auth
JWT_SECRET=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# App
NEXT_PUBLIC_API_URL=
```

---

## Color Palette & Design System

### Philosophy
Dark, focused UI inspired by motorsport dashboards (F1, iRacing, Gran Turismo).
Communicates speed, precision and trust.

### Colors

| Name | Hex | Usage |
|---|---|---|
| **Carbon Black** | `#0A0A0F` | Main background |
| **Dark Surface** | `#13131A` | Page sections |
| **Card Surface** | `#1C1C26` | Cards, panels |
| **Off White** | `#F0F0F5` | Primary text |
| **Racing Red** | `#E63B19` | Primary accent — buttons, best lap, logo |
| **Red Light** | `#FF6B47` | Hover states, highlights |
| **Trust Blue** | `#3B8AE6` | Secondary accent — possible best, info, confirmations |
| **Muted Gray** | `#6B6B80` | Secondary text, labels |

### Usage Rules
- Background is always dark — no light mode needed
- Racing Red for primary actions (CTA buttons, personal bests, alerts)
- Trust Blue for informational data (possible best, event details, stats)
- Cards use a 3px left border in the accent color to indicate category
- Typography: all caps + letter-spacing for labels (e.g. "BEST LAP", "SECTOR 1")

---

## Demo Credentials

```
Admin:  admin@lapvault.app  / admin123
User:   demo@lapvault.app   / demo123
```