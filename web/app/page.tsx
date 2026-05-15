import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { laps, tracks } from "@/lib/db/schema";
import { count, countDistinct } from "drizzle-orm";
import StatsCounter from "@/components/stats-counter";
import HomeNavbar from "@/components/home/HomeNavbar";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import LeaderboardPreview from "@/components/home/LeaderboardPreview";
import CTASection from "@/components/home/CTASection";
import HomeFooter from "@/components/home/HomeFooter";

async function isLoggedIn() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return false;
  try { await verifyToken(token); return true; } catch { return false; }
}

async function getStats() {
  const [[lapRow], [trackRow], [driverRow]] = await Promise.all([
    db.select({ total: count(laps.id) }).from(laps),
    db.select({ total: count(tracks.id) }).from(tracks),
    db.select({ total: countDistinct(laps.userId) }).from(laps),
  ]);
  return {
    laps:    Number(lapRow?.total    ?? 0),
    tracks:  Number(trackRow?.total  ?? 0),
    drivers: Number(driverRow?.total ?? 0),
  };
}

export default async function HomePage() {
  const [loggedIn, stats] = await Promise.all([isLoggedIn(), getStats()]);

  return (
    <div className="flex flex-col min-h-full bg-carbon">
      <HomeNavbar loggedIn={loggedIn} />
      <main className="flex flex-col flex-1">
        <HeroSection loggedIn={loggedIn} />
        <section className="bg-card border-t border-surface border-b">
          <StatsCounter laps={stats.laps} tracks={stats.tracks} drivers={stats.drivers} />
        </section>
        <FeaturesSection />
        <LeaderboardPreview />
        <HowItWorksSection />
        <CTASection loggedIn={loggedIn} />
      </main>
      <HomeFooter loggedIn={loggedIn} />
    </div>
  );
}
