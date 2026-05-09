import Link from "next/link";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import LogoutButton from "./LogoutButton";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const { userId } = await verifyToken(token);
    const [user] = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <div className="min-h-screen bg-carbon flex flex-col">
      <header className="sticky top-0 z-50 bg-surface border-b border-card">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-red">LAP</span>
            <span className="text-off-white">VAULT</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-muted hover:text-off-white transition-colors">Dashboard</Link>
            <Link href="/garage" className="text-sm text-muted hover:text-off-white transition-colors">Garage</Link>
            <Link href="/laps" className="text-sm text-muted hover:text-off-white transition-colors">Laps</Link>
            {user?.role === "admin" && (
              <Link href="/admin" className="text-sm text-blue hover:text-off-white transition-colors">Admin</Link>
            )}
            <div className="flex items-center gap-4 border-l border-card pl-6">
              <span className="text-sm font-semibold text-off-white">{user?.name}</span>
              <LogoutButton />
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        {children}
      </main>
    </div>
  );
}
