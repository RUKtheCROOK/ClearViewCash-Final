interface Props {
  accent?: string;
}

export function IlloHandshake({ accent = "var(--brand)" }: Props) {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
      <circle cx="32" cy="30" r="14" fill="var(--bg-tinted)" stroke="var(--line-firm)" strokeWidth="1.5" />
      <text x="32" y="35" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="11" fontWeight="500" fill="var(--ink-2)">
        JM
      </text>
      <circle cx="88" cy="30" r="14" fill="none" stroke="var(--line-firm)" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="88" y="35" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="11" fill="var(--ink-4)">
        ?
      </text>
      <path d="M48 56l24 0" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 5" />
      <path d="M68 52l4 4-4 4" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
