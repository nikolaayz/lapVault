import { NextRequest } from "next/server";
import { verifyToken, JWTPayload } from "./jwt";

export async function getSession(req: NextRequest): Promise<JWTPayload | null> {
  const cookieToken = req.cookies.get("token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = cookieToken ?? bearerToken ?? null;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}