interface Props {
  accent?: string;
}

export function IlloFlag({ accent = "var(--brand)" }: Props) {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
      <line x1="32" y1="14" x2="32" y2="90" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 18 L82 18 L72 30 L82 42 L32 42 Z" fill={accent} />
      <circle cx="32" cy="90" r="6" fill="var(--ink-2)" />
      <path
        d="M62 60 Q70 68, 78 60 M62 72 Q70 80, 78 72"
        stroke="var(--ink-4)"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
