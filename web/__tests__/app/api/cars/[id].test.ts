import { PUT, DELETE } from "@/app/api/cars/[id]/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  db: {
    update: jest.fn(),
    delete: jest.fn(),
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

const CAR_BODY = { make: "Toyota", model: "GT86", year: 2015, class: "street" };

function makePutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/cars/1", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cars/1", { method: "DELETE" });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function setupUpdateChain(returning: unknown[]): void {
  (mockDb.update as jest.Mock).mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(returning),
      }),
    }),
  });
}

function setupDeleteChain(returning: unknown[]): void {
  (mockDb.delete as jest.Mock).mockReturnValue({
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue(returning),
    }),
  });
}

describe("PUT /api/cars/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const res = await PUT(makePutRequest(CAR_BODY), makeParams("1"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
  });

  it("returns 400 for a non-numeric id", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PUT(makePutRequest(CAR_BODY), makeParams("abc"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid id");
  });

  it("returns 404 when the car does not exist or is not owned by the user", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupUpdateChain([]);
    const res = await PUT(makePutRequest(CAR_BODY), makeParams("99"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Car not found");
  });

  it("returns 200 with the updated car on success", async (): Promise<void> => {
    const updated = { id: 1, ownerId: 1, make: "Honda", model: "Civic", year: 2020, class: "street" };
    mockGetSession.mockResolvedValue(SESSION);
    setupUpdateChain([updated]);
    const res = await PUT(makePutRequest({ make: "Honda", model: "Civic", year: 2020, class: "street" }), makeParams("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(updated);
  });
});

describe("DELETE /api/cars/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), makeParams("1"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
  });

  it("returns 400 for a non-numeric id", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await DELETE(makeDeleteRequest(), makeParams("abc"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid id");
  });

  it("returns 404 when the car does not exist or is not owned by the user", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupDeleteChain([]);
    const res = await DELETE(makeDeleteRequest(), makeParams("99"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Car not found");
  });

  it("returns 200 with success: true after deletion", async (): Promise<void> => {
    const deleted = { id: 1, ownerId: 1, make: "Toyota", model: "GT86", year: 2015, class: "street" };
    mockGetSession.mockResolvedValue(SESSION);
    setupDeleteChain([deleted]);
    const res = await DELETE(makeDeleteRequest(), makeParams("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
