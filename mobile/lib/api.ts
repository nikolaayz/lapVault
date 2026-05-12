import { API_BASE } from "@/constants/api";
import { getToken } from "@/lib/auth";

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}