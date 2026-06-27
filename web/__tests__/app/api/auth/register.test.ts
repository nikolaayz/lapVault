import { POST } from "@/app/api/auth/register/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

jest.mock("@/lib/auth/jwt", () => ({
  signToken: jest.fn().mockResolvedValue("mock.jwt.token"),
}));

import { db } from "@/lib/db";

const mockDb = db as jest.Mocked<typeof db>;

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/register", {
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

function setupInsertChain(returning: unknown[]): void {
  (mockDb.insert as jest.Mock).mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue(returning),
    }),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when name is missing", async (): Promise<void> => {
    const req = makeRequest({ email: "a@b.com", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("All fields are required");
  });

  it("returns 400 when email is missing", async (): Promise<void> => {
    const req = makeRequest({ name: "Alice", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("All fields are required");
  });

  it("returns 400 when password is missing", async (): Promise<void> => {
    const req = makeRequest({ name: "Alice", email: "a@b.com" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("All fields are required");
  });

  it("returns 400 when password is shorter than 8 characters", async (): Promise<void> => {
    const req = makeRequest({ name: "Alice", email: "a@b.com", password: "short" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Password must be at least 8 characters");
  });

  it("returns 409 when email is already in use", async (): Promise<void> => {
    setupSelectChain([{ id: 1, email: "a@b.com" }]);
    const req = makeRequest({ name: "Alice", email: "a@b.com", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Email already in use");
  });

  it("returns 201 with a token cookie on successful registration", async (): Promise<void> => {
    setupSelectChain([]);
    setupInsertChain([{ id: 5, role: "user" }]);
    const req = makeRequest({ name: "Alice", email: "a@b.com", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBe("mock.jwt.token");
    expect(res.headers.get("set-cookie")).toContain("token=");
  });
});