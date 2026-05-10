export default function EmptyTimeline() {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-32 h-24 mx-auto">
      {/* Calendar body */}
      <rect x="30" y="28" width="100" height="76" rx="10" fill="#E9E4FF" />
      <rect x="30" y="28" width="100" height="28" rx="10" fill="#7C6AF7" />
      <rect x="30" y="44" width="100" height="12" fill="#7C6AF7" />
      {/* Rings */}
      <rect x="55" y="20" width="8" height="18" rx="4" fill="#5040C8" />
      <rect x="97" y="20" width="8" height="18" rx="4" fill="#5040C8" />
      {/* Grid dots */}
      <circle cx="57" cy="72" r="4" fill="#D4CAFF" />
      <circle cx="80" cy="72" r="4" fill="#D4CAFF" />
      <circle cx="103" cy="72" r="4" fill="#D4CAFF" />
      <circle cx="57" cy="90" r="4" fill="#D4CAFF" />
      <circle cx="80" cy="90" r="4" fill="#7C6AF7" />
      <circle cx="103" cy="90" r="4" fill="#D4CAFF" />
      {/* Star */}
      <text x="118" y="30" fontSize="14" textAnchor="middle">✨</text>
    </svg>
  );
}
