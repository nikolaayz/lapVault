import { PUT, DELETE } from "@/app/api/events/[id]/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
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

const VALID_BODY = { trackId: 10, title: "Track Day", date: "2026-08-01" };

function makePutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/events/1", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/events/1", { method: "DELETE" });
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

function setupSelect(rows: unknown[]): void {
  (mockDb.select as jest.Mock).mockReturnValueOnce(makeSelectChain(rows));
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

function setupDelete(): void {
  (mockDb.delete as jest.Mock).mockReturnValue({
    where: jest.fn().mockResolvedValue(undefined),
  });
}

describe("PUT /api/events/[id]", () => {
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

  it("returns 400 when trackId is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PUT(makePutRequest({ title: "Test", date: "2026-08-01" }), makeParams("1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("trackId, title, and date are required");
  });

  it("returns 400 when title is blank", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PUT(makePutRequest({ trackId: 1, title: "  ", date: "2026-08-01" }), makeParams("1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("trackId, title, and date are required");
  });

  it("returns 400 for an invalid date string", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PUT(makePutRequest({ trackId: 1, title: "Test", date: "bad" }), makeParams("1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid date");
  });

  it("returns 404 when the event does not exist", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelect([]);
    const res = await PUT(makePutRequest(VALID_BODY), makeParams("99"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Event not found");
  });

  it("returns 403 when the user is not the event creator", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelect([{ createdBy: 99 }]);
    const res = await PUT(makePutRequest(VALID_BODY), makeParams("1"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 200 with the updated event on success", async (): Promise<void> => {
    const updated = { id: 1, trackId: 10, title: "Track Day", date: new Date("2026-08-01") };
    mockGetSession.mockResolvedValue(SESSION);
    setupSelect([{ createdBy: 1 }]);
    setupUpdate([updated]);
    const res = await PUT(makePutRequest(VALID_BODY), makeParams("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.title).toBe("Track Day");
  });
});

describe("DELETE /api/events/[id]", () => {
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

  it("returns 404 when the event does not exist", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelect([]);
    const res = await DELETE(makeDeleteRequest(), makeParams("99"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Event not found");
  });

  it("returns 403 when the user is not the event creator", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelect([{ createdBy: 99 }]);
    const res = await DELETE(makeDeleteRequest(), makeParams("1"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 200 with ok: true after deletion", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION);
    setupSelect([{ createdBy: 1 }]);
    setupDelete();
    const res = await DELETE(makeDeleteRequest(), makeParams("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
