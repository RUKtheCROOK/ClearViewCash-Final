interface Props {
  accent?: string;
}

export function IlloBell({ accent = "var(--brand)" }: Props) {
  return (
    <svg width="90" height="100" viewBox="0 0 90 100" fill="none">
      <path
        d="M22 64V44a23 23 0 0146 0v20l6 8H16z"
        fill="var(--bg-tinted)"
        stroke="var(--line-firm)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M36 78a9 9 0 0018 0" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="67" cy="32" r="11" fill={accent} />
      <path
        d="M62 32l4 4 7-7"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
