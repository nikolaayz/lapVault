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

export default function FeaturesSection() {
  return (
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
  );
}
