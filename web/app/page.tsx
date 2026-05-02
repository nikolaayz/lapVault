import Link from "next/link";
import StatsCounter from "@/components/stats-counter";

const features = [
  {
    icon: "⏱",
    accentClass: "border-red",
    title: "Log Lap Times",
    description:
      "Record every lap with sector splits, conditions, and notes. Calculate your possible best automatically.",
  },
  {
    icon: "🏆",
    accentClass: "border-blue",
    title: "Live Leaderboards",
    description:
      "Compete on track-specific leaderboards separated by car class — Street, Track Prepared, Race, and more.",
  },
  {
    icon: "📅",
    accentClass: "border-red",
    title: "Track Day Events",
    description:
      "Browse upcoming events, register with your car, and see who else is showing up at your local circuit.",
  },
  {
    icon: "🚗",
    accentClass: "border-blue",
    title: "Your Garage",
    description:
      "Manage all your cars with specs, modifications, and photos. Every lap is tied to the car that set it.",
  },
];

const steps = [
  {
    number: "1",
    title: "Create your account",
    description: "Sign up for free and set up your driver profile in under a minute.",
  },
  {
    number: "2",
    title: "Add your car",
    description: "Enter your car's details and class. Add photos and modifications.",
  },
  {
    number: "3",
    title: "Hit the track",
    description: "Log your laps, track your progress, and climb the leaderboard.",
  },
];


export default function HomePage() {
  return (
    <div className="flex flex-col min-h-full bg-carbon">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-surface border-b border-card">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-red">LAP</span>
            <span className="text-off-white">VAULT</span>
          </span>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted transition-colors hover:text-off-white">
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold px-4 py-2 rounded-md bg-red text-off-white transition-colors hover:bg-red-light"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-col flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-surface">
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                "linear-gradient(#F0F0F5 1px, transparent 1px), linear-gradient(90deg, #F0F0F5 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative max-w-6xl mx-auto px-6 py-28 md:py-36 text-center">
            <p className="text-xs font-semibold tracking-widest uppercase mb-6 text-red">
              Motorsport Data Platform
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
              Track Your Times.
              <br />
              <span className="text-red">Own Your Data.</span>
            </h1>
            <p className="max-w-xl mx-auto text-lg leading-relaxed mb-10 text-muted">
              LapVault is the track day companion for serious drivers. Log lap
              times, manage your garage, compete on leaderboards, and register
              for events — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 rounded-md font-semibold text-base bg-red text-off-white transition-colors hover:bg-red-light"
              >
                Start for Free
              </Link>
              <Link
                href="/tracks"
                className="inline-flex items-center justify-center px-8 py-3 rounded-md font-semibold text-base bg-card text-off-white border border-card transition-colors hover:border-muted"
              >
                Browse Tracks →
              </Link>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="bg-card border-t border-surface border-b">
          <StatsCounter />
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3 text-blue">
              What you get
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Everything a track day driver needs
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className={`rounded-lg p-6 bg-card border-l-[3px] ${f.accentClass}`}
              >
                <div className="text-2xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-surface">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-widest uppercase mb-3 text-red">
                Getting started
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Up and running in minutes
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((s) => (
                <div key={s.number} className="text-center">
                  <p className="text-5xl font-bold mb-4 text-red opacity-30">{s.number}</p>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA banner */}
        <section className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to beat your best lap?
          </h2>
          <p className="text-base mb-8 text-muted">
            Join hundreds of drivers already using LapVault on track.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-10 py-4 rounded-md font-semibold text-base bg-red text-off-white transition-colors hover:bg-red-light"
          >
            Create Free Account
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-card">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <span>
            <span className="font-bold text-red">LAP</span>
            <span className="font-bold text-off-white">VAULT</span>
            {" "}— Track day data platform
          </span>
          <div className="flex gap-6">
            <Link href="/tracks" className="hover:text-off-white transition-colors">Tracks</Link>
            <Link href="/login" className="hover:text-off-white transition-colors">Log in</Link>
            <Link href="/register" className="hover:text-off-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}