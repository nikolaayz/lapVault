import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import StatsCounter from "@/components/stats-counter";
import HomeNavbar from "@/components/home/HomeNavbar";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import CTASection from "@/components/home/CTASection";
import HomeFooter from "@/components/home/HomeFooter";

async function isLoggedIn() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return false;
  try {
    await verifyToken(token);
    return true;
  } catch {
    return false;
  }
}

export default async function HomePage() {
  const loggedIn = await isLoggedIn();

  return (
    <div className="flex flex-col min-h-full bg-carbon">
      <HomeNavbar loggedIn={loggedIn} />
      <main className="flex flex-col flex-1">
        <HeroSection loggedIn={loggedIn} />
        <section className="bg-card border-t border-surface border-b">
          <StatsCounter />
        </section>
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection loggedIn={loggedIn} />
      </main>
      <HomeFooter loggedIn={loggedIn} />
    </div>
  );
}
