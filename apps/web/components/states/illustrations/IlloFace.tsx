export function IlloFace() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
      <rect x="20" y="20" width="60" height="60" rx="14" fill="none" stroke="var(--line-firm)" strokeWidth="1.5" />
      <path
        d="M20 32V26a6 6 0 016-6h6 M80 32V26a6 6 0 00-6-6h-6 M20 68v6a6 6 0 006 6h6 M80 68v6a6 6 0 01-6 6h-6"
        stroke="var(--ink-2)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="40" cy="44" r="2.5" fill="var(--ink-2)" />
      <circle cx="60" cy="44" r="2.5" fill="var(--ink-2)" />
      <path d="M40 60q10 8 20 0" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
