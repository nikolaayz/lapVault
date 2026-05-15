"use client";

import { useEffect, useRef, useState } from "react";

function CountUp({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) { setCount(0); return; }
    const duration = 2000;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [active, target]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function StatsCounter({ laps, tracks, drivers }: { laps: number; tracks: number; drivers: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stats = [
    { value: laps,    suffix: "+", label: "Laps Logged"  },
    { value: tracks,  suffix: "",  label: "Tracks"       },
    { value: drivers, suffix: "+", label: "Drivers"      },
    { value: 4,       suffix: "",  label: "Car Classes"  },
  ];

  return (
    <div ref={ref} className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      {stats.map((s) => (
        <div key={s.label}>
          <p className="text-3xl font-bold mb-1 text-red">
            <CountUp target={s.value} suffix={s.suffix} active={active} />
          </p>
          <p className="text-xs font-semibold tracking-widest uppercase text-muted">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
