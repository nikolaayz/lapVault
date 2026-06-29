import { GET, POST } from "@/app/api/cars/route";
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

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cars");
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/cars", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function setupSelectChain(rows: unknown[]): void {
  (mockDb.select as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(rows),
    }),
  });
}

function setupInsertChain(returning: unknown[]): void {
  (mockDb.insert as jest.Mock).mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue(returning),
    }),
  });
}

describe("GET /api/cars", () => {
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

  it("returns an empty array when the user has no cars", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelectChain([]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns the list of cars owned by the authenticated user", async (): Promise<void> => {
    const userCars = [
      { id: 1, ownerId: 1, make: "Toyota", model: "GT86", year: 2015, class: "street" },
      { id: 2, ownerId: 1, make: "Honda", model: "Civic", year: 2018, class: "street" },
    ];
    mockGetSession.mockResolvedValue(SESSION);
    setupSelectChain(userCars);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(userCars);
  });
});

describe("POST /api/cars", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const req = makePostRequest({ make: "Toyota", model: "GT86", year: 2015, class: "street" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
  });

  it("returns 400 when make is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const req = makePostRequest({ model: "GT86", year: 2015, class: "street" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("make, model, year, and class are required");
  });

  it("returns 400 when model is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const req = makePostRequest({ make: "Toyota", year: 2015, class: "street" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("make, model, year, and class are required");
  });

  it("returns 400 when year is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const req = makePostRequest({ make: "Toyota", model: "GT86", class: "street" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("make, model, year, and class are required");
  });

  it("returns 400 when class is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const req = makePostRequest({ make: "Toyota", model: "GT86", year: 2015 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("make, model, year, and class are required");
  });

  it("returns 201 with the created car on success", async (): Promise<void> => {
    const car = {
      id: 3,
      ownerId: 1,
      make: "Toyota",
      model: "GT86",
      year: 2015,
      class: "street",
      powerHp: null,
      weightKg: null,
      modifications: null,
      photoUrl: null,
    };
    mockGetSession.mockResolvedValue(SESSION);
    setupInsertChain([car]);
    const req = makePostRequest({ make: "Toyota", model: "GT86", year: 2015, class: "street" });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(car);
  });

  it("returns 201 with optional fields populated when provided", async (): Promise<void> => {
    const car = {
      id: 4,
      ownerId: 1,
      make: "Toyota",
      model: "GT86",
      year: 2015,
      class: "street",
      powerHp: 220,
      weightKg: 1200,
      modifications: "Coilovers, exhaust",
      photoUrl: "https://example.com/car.jpg",
    };
    mockGetSession.mockResolvedValue(SESSION);
    setupInsertChain([car]);
    const req = makePostRequest({
      make: "Toyota",
      model: "GT86",
      year: 2015,
      class: "street",
      powerHp: 220,
      weightKg: 1200,
      modifications: "Coilovers, exhaust",
      photoUrl: "https://example.com/car.jpg",
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(car);
  });
});
