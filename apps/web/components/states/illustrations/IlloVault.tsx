interface Props {
  accent?: string;
}

export function IlloVault({ accent = "var(--brand)" }: Props) {
  return (
    <svg width="120" height="92" viewBox="0 0 120 92" fill="none">
      <rect x="14" y="20" width="92" height="60" rx="10" fill="var(--bg-sunken)" stroke="var(--line-firm)" strokeWidth="1.5" />
      <circle cx="60" cy="50" r="16" fill="none" stroke={accent} strokeWidth="2" />
      <circle cx="60" cy="50" r="3" fill={accent} />
      <line x1="60" y1="50" x2="72" y2="38" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="28" x2="32" y2="28" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="34" x2="28" y2="34" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
