import { GET } from "@/app/api/dashboard/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  db: { select: jest.fn() },
}));

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}));


import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const mockDb = db as jest.Mocked<typeof db>;
const mockGetSession = getSession as jest.Mock;

const SESSION = { userId: 1, role: "user" as const };

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/dashboard");
}

/**
 * Returns a real Promise extended with Drizzle-style chain methods.
 * Every chained method (from/where/innerJoin/orderBy/limit) returns the same
 * object, so it can be awaited at any point in the chain.
 */
function makeSelectChain(result: unknown[]): Promise<unknown[]> & Record<string, jest.Mock> {
  const chain = Object.assign(Promise.resolve(result), {
    from: jest.fn(),
    where: jest.fn(),
    innerJoin: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
  });
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

interface SetupOptions {
  userRows?: unknown[];
  totalRows?: unknown[];
  latestLapRows?: unknown[];
  recentLapRows?: unknown[];
  upcomingEventRows?: unknown[];
  bestRows?: unknown[];
  sectorRows?: unknown[];
}

function setupDashboard({
  userRows = [{ name: "Alice" }],
  totalRows = [{ total: 0 }],
  latestLapRows = [],
  recentLapRows = [],
  upcomingEventRows = [],
  bestRows,
  sectorRows,
}: SetupOptions = {}): void {
  const selectMock = mockDb.select as jest.Mock;
  selectMock
    .mockReturnValueOnce(makeSelectChain(userRows))
    .mockReturnValueOnce(makeSelectChain(totalRows))
    .mockReturnValueOnce(makeSelectChain(latestLapRows))
    .mockReturnValueOnce(makeSelectChain(recentLapRows))
    .mockReturnValueOnce(makeSelectChain(upcomingEventRows));

  if (bestRows !== undefined) {
    selectMock
      .mockReturnValueOnce(makeSelectChain(bestRows))
      .mockReturnValueOnce(makeSelectChain(sectorRows ?? []));
  }
}

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
  });

  it("returns defaults for a user with no laps or events", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupDashboard();
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userName).toBe("Alice");
    expect(body.totalLaps).toBe(0);
    expect(body.trackName).toBeNull();
    expect(body.bestLapMs).toBeNull();
    expect(body.bestLapFormatted).toBeNull();
    expect(body.possibleBestMs).toBeNull();
    expect(body.possibleBestFormatted).toBeNull();
    expect(body.recentLaps).toEqual([]);
    expect(body.upcomingEvents).toEqual([]);
  });

  it("falls back to 'Driver' when the user record is not found", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupDashboard({ userRows: [] });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userName).toBe("Driver");
  });

  it("returns best lap formatted when the user has laps but no sector times", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupDashboard({
      totalRows: [{ total: 4 }],
      latestLapRows: [{ trackId: 1, trackName: "Silverstone" }],
      bestRows: [{ bestMs: 90000 }],
      sectorRows: [{ s1: null, s2: null, s3: null }],
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalLaps).toBe(4);
    expect(body.trackName).toBe("Silverstone");
    expect(body.bestLapMs).toBe(90000);
    expect(body.bestLapFormatted).toBe("1:30.000");
    expect(body.possibleBestMs).toBeNull();
    expect(body.possibleBestFormatted).toBeNull();
  });

  it("calculates possible best from sector minimums", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupDashboard({
      latestLapRows: [{ trackId: 1, trackName: "Brands Hatch" }],
      bestRows: [{ bestMs: 90000 }],
      sectorRows: [{ s1: 28000, s2: 32000, s3: 25000 }],
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.possibleBestMs).toBe(85000);
    expect(body.possibleBestFormatted).toBe("1:25.000");
  });

  it("serializes recentLaps createdAt to ISO string", async (): Promise<void> => {
    const createdAt = new Date("2026-05-10T10:00:00.000Z");
    mockGetSession.mockResolvedValue(SESSION);
    setupDashboard({
      latestLapRows: [{ trackId: 1, trackName: "Silverstone" }],
      recentLapRows: [
        { id: 1, lapTimeMs: 90000, conditions: "dry", createdAt, trackName: "Silverstone", carMake: "Toyota", carModel: "GT86", carYear: 2015 },
      ],
      bestRows: [{ bestMs: 90000 }],
      sectorRows: [],
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recentLaps).toHaveLength(1);
    expect(body.recentLaps[0].createdAt).toBe(createdAt.toISOString());
  });

  it("serializes upcomingEvents date to ISO string", async (): Promise<void> => {
    const eventDate = new Date("2026-08-01T09:00:00.000Z");
    mockGetSession.mockResolvedValue(SESSION);
    setupDashboard({
      upcomingEventRows: [{ id: 10, title: "Summer Track Day", date: eventDate, trackName: "Brands Hatch" }],
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.upcomingEvents).toHaveLength(1);
    expect(body.upcomingEvents[0].date).toBe(eventDate.toISOString());
    expect(body.upcomingEvents[0].title).toBe("Summer Track Day");
  });
});
