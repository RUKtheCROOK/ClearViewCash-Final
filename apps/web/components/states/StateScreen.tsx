import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  paddingTop?: number;
  paddingBottom?: number;
  spaceClass?: string;
  spaceHue?: number;
  style?: CSSProperties;
}

export function StateScreen({ children, paddingTop = 14, paddingBottom = 24, spaceClass, spaceHue, style }: Props) {
  const inline: CSSProperties = {
    background: "var(--bg-canvas)",
    minHeight: "100%",
    paddingTop,
    paddingBottom,
    ...style,
  };
  if (spaceHue !== undefined) {
    (inline as Record<string, string | number>)["--space-h"] = spaceHue;
  }
  return (
    <div className={spaceClass ? `space ${spaceClass}` : "space"} style={inline}>
      {children}
    </div>
  );
}
