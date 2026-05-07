import { NextRequest } from "next/server";
import { verifyToken, JWTPayload } from "./jwt";

export async function getSession(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}