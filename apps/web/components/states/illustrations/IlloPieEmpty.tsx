interface Props {
  accent?: string;
}

export function IlloPieEmpty({ accent = "var(--brand)" }: Props) {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="36" fill="none" stroke="var(--line-soft)" strokeWidth="14" strokeDasharray="4 6" />
      <circle
        cx="50"
        cy="50"
        r="36"
        fill="none"
        stroke={accent}
        strokeWidth="14"
        strokeDasharray="22 200"
        strokeDashoffset="-10"
        strokeLinecap="butt"
        transform="rotate(-90 50 50)"
      />
      <circle cx="50" cy="50" r="20" fill="var(--bg-surface)" />
    </svg>
  );
}
