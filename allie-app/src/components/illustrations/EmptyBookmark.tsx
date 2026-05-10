export default function EmptyBookmark() {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-32 h-24 mx-auto">
      {/* Main bookmark */}
      <path d="M55 22 H105 A8 8 0 0 1 113 30 V98 L80 82 L47 98 V30 A8 8 0 0 1 55 22Z" fill="#7C6AF7" />
      {/* Inner shine */}
      <path d="M63 30 H97 A4 4 0 0 1 101 34 V52 L80 62 L59 52 V34 A4 4 0 0 1 63 30Z" fill="#9D8EF9" />
      {/* Small bookmarks */}
      <path d="M118 35 H134 A4 4 0 0 1 138 39 V68 L126 60 L114 68 V39 A4 4 0 0 1 118 35Z" fill="#D4CAFF" />
      <path d="M26 42 H40 A4 4 0 0 1 44 46 V72 L33 65 L22 72 V46 A4 4 0 0 1 26 42Z" fill="#E9E4FF" />
      {/* Star */}
      <text x="80" y="48" fontSize="14" textAnchor="middle">⭐</text>
    </svg>
  );
}
