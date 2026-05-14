import Link from "next/link";

export default function HeroSection({ loggedIn }: { loggedIn: boolean }) {
  return (
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
          {loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-3 rounded-md font-semibold text-base bg-red text-off-white transition-colors hover:bg-red-light"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/laps"
                className="inline-flex items-center justify-center px-8 py-3 rounded-md font-semibold text-base bg-card text-off-white border border-card transition-colors hover:border-muted"
              >
                My Laps →
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </section>
  );
}
