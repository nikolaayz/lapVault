import { PUT, DELETE } from "@/app/api/laps/[id]/route";
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

const VALID_BODY = { carId: 5, trackId: 10, lapTimeMs: 90000, conditions: "dry" };

function makePutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/laps/1", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/laps/1", { method: "DELETE" });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function setupUpdate(returning: unknown[]): void {
  (mockDb.update as jest.Mock).mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(returning),
      }),
    }),
  });
}

function setupDelete(returning: unknown[]): void {
  (mockDb.delete as jest.Mock).mockReturnValue({
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue(returning),
    }),
  });
}

describe("PUT /api/laps/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const res = await PUT(makePutRequest(VALID_BODY), makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-numeric id", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PUT(makePutRequest(VALID_BODY), makeParams("abc"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid id");
  });

  it("returns 400 when carId is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PUT(makePutRequest({ trackId: 10, lapTimeMs: 90000, conditions: "dry" }), makeParams("1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("carId, trackId, lapTimeMs, and conditions are required");
  });

  it("returns 400 when trackId is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PUT(makePutRequest({ carId: 5, lapTimeMs: 90000, conditions: "dry" }), makeParams("1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("carId, trackId, lapTimeMs, and conditions are required");
  });

  it("returns 400 when lapTimeMs is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PUT(makePutRequest({ carId: 5, trackId: 10, conditions: "dry" }), makeParams("1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("carId, trackId, lapTimeMs, and conditions are required");
  });

  it("returns 400 when conditions is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PUT(makePutRequest({ carId: 5, trackId: 10, lapTimeMs: 90000 }), makeParams("1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("carId, trackId, lapTimeMs, and conditions are required");
  });

  it("returns 404 when the lap does not exist or is not owned by the user", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupUpdate([]);
    const res = await PUT(makePutRequest(VALID_BODY), makeParams("99"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Lap not found");
  });

  it("returns 200 with the updated lap on success", async (): Promise<void> => {
    const updated = { id: 1, userId: 1, carId: 5, trackId: 10, lapTimeMs: 90000, conditions: "dry" };
    mockGetSession.mockResolvedValue(SESSION);
    setupUpdate([updated]);
    const res = await PUT(makePutRequest(VALID_BODY), makeParams("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(updated);
  });
});

describe("DELETE /api/laps/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-numeric id", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await DELETE(makeDeleteRequest(), makeParams("abc"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid id");
  });

  it("returns 404 when the lap does not exist or is not owned by the user", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupDelete([]);
    const res = await DELETE(makeDeleteRequest(), makeParams("99"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Lap not found");
  });

  it("returns 200 with success: true after deletion", async (): Promise<void> => {
    const deleted = { id: 1, userId: 1, carId: 5, trackId: 10, lapTimeMs: 90000 };
    mockGetSession.mockResolvedValue(SESSION);
    setupDelete([deleted]);
    const res = await DELETE(makeDeleteRequest(), makeParams("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
