import { POST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

jest.mock("@/lib/auth/jwt", () => ({
  signToken: jest.fn().mockResolvedValue("mock.jwt.token"),
}));

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const mockDb = db as jest.Mocked<typeof db>;
const mockBcryptCompare = bcrypt.compare as jest.Mock;

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
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

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when email is missing", async (): Promise<void> => {
    const req = makeRequest({ password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Email and password are required");
  });

  it("returns 400 when password is missing", async (): Promise<void> => {
    const req = makeRequest({ email: "a@b.com" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Email and password are required");
  });

  it("returns 401 when no user is found for the given email", async (): Promise<void> => {
    setupSelectChain([]);
    const req = makeRequest({ email: "unknown@b.com", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid email or password");
  });

  it("returns 401 when the password does not match", async (): Promise<void> => {
    setupSelectChain([{ id: 1, email: "a@b.com", passwordHash: "hash", role: "user" }]);
    mockBcryptCompare.mockResolvedValue(false);
    const req = makeRequest({ email: "a@b.com", password: "wrongpassword" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid email or password");
  });

  it("returns 200 with a token cookie on successful login", async (): Promise<void> => {
    setupSelectChain([{ id: 1, email: "a@b.com", passwordHash: "hash", role: "user" }]);
    mockBcryptCompare.mockResolvedValue(true);
    const req = makeRequest({ email: "a@b.com", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBe("mock.jwt.token");
    expect(res.headers.get("set-cookie")).toContain("token=");
  });
});