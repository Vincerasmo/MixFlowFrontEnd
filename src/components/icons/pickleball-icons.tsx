export function PickleballIcon({
  className = "size-6",
  spin = false,
}: {
  className?: string;
  spin?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={`${className} ${spin ? "ball-spin" : ""}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="ball-grad" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="60%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#ball-grad)" stroke="#78350f" strokeOpacity="0.15" strokeWidth="1" />
      {[
        [12, 10], [22, 8], [30, 14],
        [10, 20], [20, 20], [30, 24],
        [14, 28], [24, 30], [8, 14],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.6" fill="#78350f" fillOpacity="0.35" />
      ))}
    </svg>
  );
}

export function PaddleIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="10" cy="10" rx="7" ry="8" />
      <path d="M15 15l5 5" />
      <path d="M13 17l3 3" />
    </svg>
  );
}