interface Props {
  accent?: string;
}

export function IlloCalendar({ accent = "var(--brand)" }: Props) {
  return (
    <svg width="110" height="100" viewBox="0 0 110 100" fill="none">
      <rect x="14" y="18" width="82" height="70" rx="8" fill="var(--bg-surface)" stroke="var(--line-firm)" strokeWidth="1.5" />
      <rect x="14" y="18" width="82" height="14" rx="8" fill={accent} />
      <rect x="14" y="26" width="82" height="6" fill={accent} />
      <line x1="30" y1="14" x2="30" y2="22" stroke="var(--ink-2)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="80" y1="14" x2="80" y2="22" stroke="var(--ink-2)" strokeWidth="2.5" strokeLinecap="round" />
      {[0, 1, 2, 3].flatMap((r) =>
        [0, 1, 2, 3, 4].map((c) => (
          <circle key={`${r}-${c}`} cx={26 + c * 15} cy={45 + r * 12} r="2.5" fill="var(--line-soft)" />
        )),
      )}
      <circle cx="56" cy="69" r="6" fill={accent} />
    </svg>
  );
}
