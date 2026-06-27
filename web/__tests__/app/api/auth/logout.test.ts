import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("returns success: true", async (): Promise<void> => {
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("clears the token cookie by setting maxAge to 0", async (): Promise<void> => {
    const res = await POST();
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("token=");
    expect(setCookie).toContain("Max-Age=0");
  });
});