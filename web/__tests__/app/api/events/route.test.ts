import { GET, POST } from "@/app/api/events/route";
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

const SESSION_USER = { userId: 1, role: "user" as const };
const SESSION_ADMIN = { userId: 1, role: "admin" as const };

const EVENT_DATE = new Date("2026-08-01T09:00:00.000Z");
const CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

const EVENT_ROW = {
  id: 1,
  title: "Summer Track Day",
  date: EVENT_DATE,
  maxParticipants: 20,
  allowedClasses: ["street"],
  description: "Fun day",
  createdAt: CREATED_AT,
  creatorId: 1,
  creatorName: "Alice",
  trackId: 10,
  trackName: "Silverstone",
  trackCountry: "UK",
  trackLengthKm: 5.891,
};

function makeGetRequest(search = ""): NextRequest {
  return new NextRequest(`http://localhost/api/events${search}`);
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/events", {
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
    groupBy: jest.fn(),
  });
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);
  return chain;
}

function setupGet(rows: unknown[], regCounts: unknown[], userRegs: unknown[], total?: unknown[]): void {
  const selectMock = mockDb.select as jest.Mock;
  selectMock
    .mockReturnValueOnce(makeSelectChain(rows))
    .mockReturnValueOnce(makeSelectChain(regCounts))
    .mockReturnValueOnce(makeSelectChain(userRegs));
  if (total !== undefined) {
    selectMock.mockReturnValueOnce(makeSelectChain(total));
  }
}

describe("GET /api/events", () => {
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

  it("returns an empty array when there are no events", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_USER);
    setupGet([], [], []);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("maps events with ISO dates, track, registrationCount, and myRegistration", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_USER);
    setupGet(
      [EVENT_ROW],
      [{ eventId: 1, total: 3 }],
      [{ eventId: 1, carId: 5, status: "confirmed" }],
    );
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const [event] = await res.json();
    expect(event.date).toBe(EVENT_DATE.toISOString());
    expect(event.createdAt).toBe(CREATED_AT.toISOString());
    expect(event.track).toEqual({ id: 10, name: "Silverstone", country: "UK", lengthKm: 5.891 });
    expect(event.registrationCount).toBe(3);
    expect(event.myRegistration).toEqual({ carId: 5, status: "confirmed" });
  });

  it("sets isCreator to true when the session user created the event", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_USER);
    setupGet([{ ...EVENT_ROW, creatorId: 1 }], [], []);
    const [event] = await (await GET(makeGetRequest())).json();
    expect(event.isCreator).toBe(true);
  });

  it("sets isCreator to false when a different user created the event", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_USER);
    setupGet([{ ...EVENT_ROW, creatorId: 99 }], [], []);
    const [event] = await (await GET(makeGetRequest())).json();
    expect(event.isCreator).toBe(false);
  });

  it("sets myRegistration to null and registrationCount to 0 when user has not registered", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_USER);
    setupGet([EVENT_ROW], [], []);
    const [event] = await (await GET(makeGetRequest())).json();
    expect(event.myRegistration).toBeNull();
    expect(event.registrationCount).toBe(0);
  });

  it("returns a paginated response when the page param is provided", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_USER);
    setupGet([EVENT_ROW], [], [], [{ total: 42 }]);
    const res = await GET(makeGetRequest("?page=2&limit=10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
    expect(body.total).toBe(42);
    expect(body.totalPages).toBe(5);
  });
});

describe("POST /api/events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makePostRequest({ trackId: 1, title: "Test", date: "2026-08-01" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when the user is not an admin", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_USER);
    const res = await POST(makePostRequest({ trackId: 1, title: "Test", date: "2026-08-01" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 when trackId is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    const res = await POST(makePostRequest({ title: "Test", date: "2026-08-01" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("trackId, title, and date are required");
  });

  it("returns 400 when title is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    const res = await POST(makePostRequest({ trackId: 1, date: "2026-08-01" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("trackId, title, and date are required");
  });

  it("returns 400 when title is blank whitespace", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    const res = await POST(makePostRequest({ trackId: 1, title: "   ", date: "2026-08-01" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("trackId, title, and date are required");
  });

  it("returns 400 when date is missing", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    const res = await POST(makePostRequest({ trackId: 1, title: "Test" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("trackId, title, and date are required");
  });

  it("returns 400 for an invalid date string", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    const res = await POST(makePostRequest({ trackId: 1, title: "Test", date: "not-a-date" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid date");
  });

  it("returns 201 with the created event on success", async (): Promise<void> => {
    const event = { id: 5, trackId: 1, title: "Test", date: EVENT_DATE };
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    (mockDb.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([event]),
      }),
    });
    const res = await POST(makePostRequest({ trackId: 1, title: "Test", date: "2026-08-01" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(5);
    expect(body.title).toBe("Test");
  });
});
