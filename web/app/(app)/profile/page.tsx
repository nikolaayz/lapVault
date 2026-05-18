import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let name = "";
  let email = "";
  let avatarUrl: string | null = null;

  if (token) {
    try {
      const { userId } = await verifyToken(token);
      const [user] = await db
        .select({ name: users.name, email: users.email, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (user) { name = user.name; email = user.email; avatarUrl = user.avatarUrl; }
    } catch {
      // layout handles redirect
    }
  }

  return <ProfileClient initialName={name} initialEmail={email} initialAvatarUrl={avatarUrl} />;
}
