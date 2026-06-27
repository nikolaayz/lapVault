import { signToken, verifyToken, JWTPayload } from "@/lib/auth/jwt";

describe("signToken", () => {
  it("returns a non-empty string", async (): Promise<void> => {
    const token = await signToken({ userId: 1, role: "user" });
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("produces a token with three JWT segments", async (): Promise<void> => {
    const token = await signToken({ userId: 1, role: "user" });
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("verifyToken", () => {
  it("returns the original payload for a valid token", async (): Promise<void> => {
    const payload: JWTPayload = { userId: 42, role: "admin" };
    const token = await signToken(payload);
    const result = await verifyToken(token);
    expect(result.userId).toBe(payload.userId);
    expect(result.role).toBe(payload.role);
  });

  it("throws for a tampered token", async (): Promise<void> => {
    const token = await signToken({ userId: 1, role: "user" });
    const tampered = token.slice(0, -5) + "XXXXX";
    await expect(verifyToken(tampered)).rejects.toThrow();
  });

  it("throws for a completely invalid token string", async (): Promise<void> => {
    await expect(verifyToken("not.a.token")).rejects.toThrow();
  });
});