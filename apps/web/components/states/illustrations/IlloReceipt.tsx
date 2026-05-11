interface Props {
  accent?: string;
}

export function IlloReceipt({ accent = "var(--brand)" }: Props) {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
      <path
        d="M22 12h56v76l-7-5-7 5-7-5-7 5-7-5-7 5-7-5-7 5V12z"
        fill="var(--paper)"
        stroke="var(--line-firm)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="30" y1="26" x2="58" y2="26" stroke="var(--ink-3)" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="30" y1="36" x2="70" y2="36" stroke="var(--ink-4)" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="30" y1="44" x2="62" y2="44" stroke="var(--ink-4)" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="30" y1="52" x2="68" y2="52" stroke="var(--ink-4)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="74" cy="68" r="14" fill={accent} />
      <path d="M68 68l4 4 8-8" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
