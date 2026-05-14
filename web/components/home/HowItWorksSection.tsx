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

export default function HowItWorksSection() {
  return (
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
  );
}
