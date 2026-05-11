export function IlloPlug() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
      <rect x="6" y="28" width="40" height="24" rx="6" fill="var(--bg-surface)" stroke="var(--line-firm)" strokeWidth="1.5" />
      <line
        x1="46"
        y1="40"
        x2="56"
        y2="40"
        stroke="var(--ink-4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      <rect x="56" y="22" width="58" height="36" rx="8" fill="var(--neg-tint)" stroke="var(--neg)" strokeWidth="1.5" />
      <path
        d="M70 40h30 M70 32l8 8-8 8"
        stroke="var(--neg)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="18" cy="40" r="3" fill="var(--ink-3)" />
      <circle cx="32" cy="40" r="3" fill="var(--ink-3)" />
    </svg>
  );
}
