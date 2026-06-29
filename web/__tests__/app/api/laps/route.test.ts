import { GET, POST } from "@/app/api/laps/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const mockDb = db as jest.Mocked<typeof db>;
const mockGetSession = getSession as jest.Mock;

const SESSION = { userId: 1, role: "user" as const };

const CREATED_AT = new Date("2026-05-10T10:00:00.000Z");

const LAP_ROW = {
  id: 1,
  lapTimeMs: 90000,
  sector1Ms: 28000,
  sector2Ms: 32000,
  sector3Ms: 30000,
  conditions: "dry",
  notes: "Good run",
  createdAt: CREATED_AT,
  carId: 5,
  carMake: "Toyota",
  carModel: "GT86",
  carYear: 2015,
  carClass: "street",
  trackId: 10,
  trackName: "Silverstone",
  trackCountry: "UK",
  trackLengthKm: 5.891,
};

function makeGetRequest(search = ""): NextRequest {
  return new NextRequest(`http://localhost/api/laps${search}`);
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/laps", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeSelectChain(result: unknown[]): Promise<unknown[]> & Record<string, jest.Mock> {
  const chain = Object.assign(Promise.resolve(result), {
    from: jest.fn(),
    where: jest.fn(),
    innerJoin: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn(),
  });
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  return chain;
}

describe("GET /api/laps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
  });

  it("returns an empty array when the user has no laps", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    (mockDb.select as jest.Mock).mockReturnValueOnce(makeSelectChain([]));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("maps laps with ISO createdAt and nested car and track objects", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    (mockDb.select as jest.Mock).mockReturnValueOnce(makeSelectChain([LAP_ROW]));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const [lap] = await res.json();
    expect(lap.createdAt).toBe(CREATED_AT.toISOString());
    expect(lap.car).toEqual({ id: 5, make: "Toyota", model: "GT86", year: 2015, class: "street" });
    expect(lap.track).toEqual({ id: 10, name: "Silverstone", country: "UK", lengthKm: 5.891 });
    expect(lap.lapTimeMs).toBe(90000);
  });

  it("returns a paginated response when the page param is provided", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    (mockDb.select as jest.Mock)
      .mockReturnValueOnce(makeSelectChain([LAP_ROW]))
      .mockReturnValueOnce(makeSelectChain([{ total: 50 }]));
    const res = await GET(makeGetRequest("?page=3&limit=10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.page).toBe(3);
    expect(body.limit).toBe(10);
    expect(body.total).toBe(50);
    expect(body.totalPages).toBe(5);
  });
});

describe("POST /api/laps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makePostRequest({ carId: 5, trackId: 10, lapTimeMs: 90000, conditions: "dry" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when carId is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makePostRequest({ trackId: 10, lapTimeMs: 90000, conditions: "dry" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("carId, trackId, lapTimeMs, and conditions are required");
  });

  it("returns 400 when trackId is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makePostRequest({ carId: 5, lapTimeMs: 90000, conditions: "dry" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("carId, trackId, lapTimeMs, and conditions are required");
  });

  it("returns 400 when lapTimeMs is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makePostRequest({ carId: 5, trackId: 10, conditions: "dry" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("carId, trackId, lapTimeMs, and conditions are required");
  });

  it("returns 400 when conditions is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makePostRequest({ carId: 5, trackId: 10, lapTimeMs: 90000 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("carId, trackId, lapTimeMs, and conditions are required");
  });

  it("returns 400 when lapTimeMs is zero (treated as missing)", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makePostRequest({ carId: 5, trackId: 10, lapTimeMs: 0, conditions: "dry" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("carId, trackId, lapTimeMs, and conditions are required");
  });

  it("returns 400 when lapTimeMs is negative", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makePostRequest({ carId: 5, trackId: 10, lapTimeMs: -1000, conditions: "dry" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid lap time");
  });

  it("returns 400 when lapTimeMs is a string", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makePostRequest({ carId: 5, trackId: 10, lapTimeMs: "90000", conditions: "dry" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid lap time");
  });

  it("returns 201 with the created lap on success", async (): Promise<void> => {
    const lap = { id: 7, userId: 1, carId: 5, trackId: 10, lapTimeMs: 90000, conditions: "dry" };
    mockGetSession.mockResolvedValue(SESSION);
    (mockDb.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([lap]),
      }),
    });
    const res = await POST(makePostRequest({ carId: 5, trackId: 10, lapTimeMs: 90000, conditions: "dry" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(lap);
  });
});
