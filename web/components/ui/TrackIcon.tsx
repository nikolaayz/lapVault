const icons: Record<string, string> = {
  // Nürburgring
  "Nürburgring Nordschleife":       "/tracks/nurb-icon.svg",
  // Spa
  "Spa-Francorchamps":              "/tracks/spa-icon.svg",
  "Circuit de Spa-Francorchamps":   "/tracks/spa-icon.svg",
  // Silverstone
  "Silverstone GP":                 "/tracks/silverstone-icon.svg",
  "Silverstone Circuit":            "/tracks/silverstone-icon.svg",
  // Monza
  "Monza":                          "/tracks/monza-icon.svg",
  "Autodromo Nazionale Monza":      "/tracks/monza-icon.svg",
  // Brands Hatch
  "Brands Hatch GP":                "/tracks/brands-icon.svg",
  // Imola
  "Autodromo Enzo e Dino Ferrari":  "/tracks/imola-icon.svg",
  // Zandvoort
  "Circuit Zandvoort":              "/tracks/zandvoort-icon.svg",
  // Barcelona
  "Circuit de Barcelona-Catalunya": "/tracks/barcelona-icon.svg",
  // Monaco
  "Circuit de Monaco":              "/tracks/monaco-icon.svg",
  // Donington
  "Donington Park":                 "/tracks/donington-icon.svg",
  // Hockenheim
  "Hockenheimring GP":              "/tracks/hockenheim-icon.svg",
  // Mugello
  "Mugello Circuit":                "/tracks/mugello-icon.svg",
  // Oulton Park
  "Oulton Park International":      "/tracks/oulton-icon.svg",
  // Red Bull Ring
  "Red Bull Ring":                  "/tracks/redbullring-icon.svg",
  // Snetterton
  "Snetterton 300":                 "/tracks/snetterton-icon.svg",
};

export function TrackIcon({ name, size = 56 }: { name: string; size?: number }) {
  const src = icons[name];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={Math.round(size * 0.6)}
      className="object-contain shrink-0 opacity-90"
    />
  );
}
