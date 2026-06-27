import { GET } from "@/app/api/auth/me/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const mockDb = db as jest.Mocked<typeof db>;
const mockGetSession = getSession as jest.Mock;

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/auth/me");
}

function setupSelectChain(rows: unknown[]): void {
  (mockDb.select as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(rows),
      }),
    }),
  });
}

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when there is no active session", async (): Promise<void> => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
  });

  it("returns 404 when the session user does not exist in the database", async (): Promise<void> => {
    mockGetSession.mockResolvedValue({ userId: 99, role: "user" });
    setupSelectChain([]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("User not found");
  });

  it("returns user data for an authenticated session", async (): Promise<void> => {
    const user = { id: 1, name: "Alice", email: "a@b.com", role: "user" };
    mockGetSession.mockResolvedValue({ userId: 1, role: "user" });
    setupSelectChain([user]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(user);
  });
});