import { getSession } from "@/lib/auth/session";
import { signToken } from "@/lib/auth/jwt";
import { NextRequest } from "next/server";

function makeRequest(options: { cookie?: string; authorization?: string } = {}): NextRequest {
  const headers = new Headers();
  if (options.cookie) headers.set("cookie", `token=${options.cookie}`);
  if (options.authorization) headers.set("authorization", options.authorization);
  return new NextRequest("http://localhost/api/auth/me", { headers });
}

describe("getSession", () => {
  it("returns null when no token is present", async (): Promise<void> => {
    const req = makeRequest();
    const session = await getSession(req);
    expect(session).toBeNull();
  });

  it("returns the payload when a valid token is in the cookie", async (): Promise<void> => {
    const token = await signToken({ userId: 7, role: "user" });
    const req = makeRequest({ cookie: token });
    const session = await getSession(req);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe(7);
    expect(session?.role).toBe("user");
  });

  it("returns the payload when a valid Bearer token is in the Authorization header", async (): Promise<void> => {
    const token = await signToken({ userId: 3, role: "admin" });
    const req = makeRequest({ authorization: `Bearer ${token}` });
    const session = await getSession(req);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe(3);
    expect(session?.role).toBe("admin");
  });

  it("prefers the cookie token over the Authorization header", async (): Promise<void> => {
    const cookieToken = await signToken({ userId: 10, role: "user" });
    const headerToken = await signToken({ userId: 99, role: "admin" });
    const req = makeRequest({ cookie: cookieToken, authorization: `Bearer ${headerToken}` });
    const session = await getSession(req);
    expect(session?.userId).toBe(10);
  });

  it("returns null for an invalid token", async (): Promise<void> => {
    const req = makeRequest({ cookie: "invalid.token.value" });
    const session = await getSession(req);
    expect(session).toBeNull();
  });
});