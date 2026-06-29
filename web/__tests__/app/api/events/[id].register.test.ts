import {
  POST as REGISTER,
  DELETE as UNREGISTER,
} from "@/app/api/events/[id]/register/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
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

const EVENT = { id: 1, allowedClasses: null, maxParticipants: null };
const CAR = { id: 5, class: "street", ownerId: 1 };

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/events/1/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/events/1/register", { method: "DELETE" });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeSelectChain(result: unknown[]): Promise<unknown[]> & Record<string, jest.Mock> {
  const chain = Object.assign(Promise.resolve(result), {
    from: jest.fn(),
    where: jest.fn(),
    limit: jest.fn(),
  });
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

function setupSelects(...results: unknown[][]): void {
  const selectMock = mockDb.select as jest.Mock;
  for (const result of results) {
    selectMock.mockReturnValueOnce(makeSelectChain(result));
  }
}

function setupInsert(returning: unknown[]): void {
  (mockDb.insert as jest.Mock).mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue(returning),
    }),
  });
}

function setupDelete(): void {
  (mockDb.delete as jest.Mock).mockReturnValue({
    where: jest.fn().mockResolvedValue(undefined),
  });
}

describe("POST /api/events/[id]/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const res = await REGISTER(makePostRequest({ carId: 5 }), makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-numeric event id", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await REGISTER(makePostRequest({ carId: 5 }), makeParams("abc"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid id");
  });

  it("returns 400 when carId is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await REGISTER(makePostRequest({}), makeParams("1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("carId is required");
  });

  it("returns 404 when the event does not exist", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelects([]);
    const res = await REGISTER(makePostRequest({ carId: 5 }), makeParams("1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Event not found");
  });

  it("returns 404 when the car does not exist or is not owned by the user", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelects([EVENT], []);
    const res = await REGISTER(makePostRequest({ carId: 99 }), makeParams("1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Car not found");
  });

  it("returns 404 when the car is owned by a different user", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelects([EVENT], [{ ...CAR, ownerId: 99 }]);
    const res = await REGISTER(makePostRequest({ carId: 5 }), makeParams("1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Car not found");
  });

  it("returns 400 when the car class is not allowed for the event", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelects(
      [{ ...EVENT, allowedClasses: ["track"] }],
      [{ ...CAR, class: "street" }],
    );
    const res = await REGISTER(makePostRequest({ carId: 5 }), makeParams("1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Your car class is not allowed for this event");
  });

  it("returns 409 when the user is already registered", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelects([EVENT], [CAR], [{ id: 10 }]);
    const res = await REGISTER(makePostRequest({ carId: 5 }), makeParams("1"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Already registered");
  });

  it("returns 409 when the event is full", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelects(
      [{ ...EVENT, maxParticipants: 2 }],
      [CAR],
      [],
      [{ total: 2 }],
    );
    const res = await REGISTER(makePostRequest({ carId: 5 }), makeParams("1"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Event is full");
  });

  it("returns 201 with the registration on success", async (): Promise<void> => {
    const reg = { id: 20, eventId: 1, userId: 1, carId: 5, status: "confirmed" };
    mockGetSession.mockResolvedValue(SESSION);
    setupSelects([EVENT], [CAR], []);
    setupInsert([reg]);
    const res = await REGISTER(makePostRequest({ carId: 5 }), makeParams("1"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(reg);
  });
});

describe("DELETE /api/events/[id]/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const res = await UNREGISTER(makeDeleteRequest(), makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-numeric event id", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await UNREGISTER(makeDeleteRequest(), makeParams("abc"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid id");
  });

  it("returns 404 when the user is not registered for the event", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelects([]);
    const res = await UNREGISTER(makeDeleteRequest(), makeParams("1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not registered");
  });

  it("returns 200 with ok: true after unregistering", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelects([{ id: 10 }]);
    setupDelete();
    const res = await UNREGISTER(makeDeleteRequest(), makeParams("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
