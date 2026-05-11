// Stroke-based SVG icon set used by the design system.
// Mobile: react-native-svg. Web has its own parallel set in apps/web/lib/icons.tsx.

import Svg, { Circle, Path, Rect } from "react-native-svg";

interface IconProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

const defaultProps = {
  color: "currentColor",
  size: 20,
  strokeWidth: 1.6,
};

function withDefaults(props: IconProps): Required<IconProps> {
  return { ...defaultProps, ...props };
}

export const I = {
  bell: (p: IconProps = {}) => {
    const { color, size, strokeWidth } = withDefaults(p);
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 16V11a6 6 0 0112 0v5l1 2H5z" />
        <Path d="M10 20a2 2 0 004 0" />
      </Svg>
    );
  },
  gear: (p: IconProps = {}) => {
    const { color, size, strokeWidth } = withDefaults(p);
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="3" />
        <Path d="M19.4 12.9a7.6 7.6 0 000-1.8l2-1.5-2-3.4-2.4.9a7 7 0 00-1.5-.9L15 3h-4l-.5 2.6a7 7 0 00-1.5.9l-2.4-.9-2 3.4 2 1.5a7.6 7.6 0 000 1.8l-2 1.5 2 3.4 2.4-.9a7 7 0 001.5.9l.5 2.6h4l.5-2.6a7 7 0 001.5-.9l2.4.9 2-3.4z" />
      </Svg>
    );
  },
  chev: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 2 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 9l6 6 6-6" />
      </Svg>
    );
  },
  chevR: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 2 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 6l6 6-6 6" />
      </Svg>
    );
  },
  chevL: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 2 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M15 6l-6 6 6 6" />
      </Svg>
    );
  },
  send: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 12h14M13 5l7 7-7 7" />
      </Svg>
    );
  },
  receive: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M19 12H5M11 5L4 12l7 7" />
      </Svg>
    );
  },
  move: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7 7h11l-3-3M17 17H6l3 3" />
      </Svg>
    );
  },
  cart: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="9" cy="20" r="1.5" />
        <Circle cx="17" cy="20" r="1.5" />
        <Path d="M3 4h2l3 12h11l2-9H6" />
      </Svg>
    );
  },
  bolt: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
      </Svg>
    );
  },
  film: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="5" width="18" height="14" rx="2" />
        <Path d="M7 5v14M17 5v14M3 12h18" />
      </Svg>
    );
  },
  coffee: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 8h13v6a4 4 0 01-4 4H8a4 4 0 01-4-4z" />
        <Path d="M17 10h2a2 2 0 010 4h-2" />
        <Path d="M8 3v2M12 3v2" />
      </Svg>
    );
  },
  home: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 11l9-7 9 7" />
        <Path d="M5 10v10h14V10" />
      </Svg>
    );
  },
  card: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="6" width="18" height="13" rx="2" />
        <Path d="M3 11h18" />
      </Svg>
    );
  },
  spaces: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="9" cy="9" r="4" />
        <Circle cx="16" cy="15" r="4" />
      </Svg>
    );
  },
  spark: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 17l5-6 4 4 5-7 4 5" />
      </Svg>
    );
  },
  check: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 2.2 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 12l4 4 10-10" />
      </Svg>
    );
  },
  close: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 2 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 6l12 12M18 6L6 18" />
      </Svg>
    );
  },
  plus: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 2 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 5v14M5 12h14" />
      </Svg>
    );
  },
  more: (p: IconProps = {}) => {
    const { color, size = 16 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
        <Circle cx="5" cy="12" r="1.6" />
        <Circle cx="12" cy="12" r="1.6" />
        <Circle cx="19" cy="12" r="1.6" />
      </Svg>
    );
  },
  user: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="9" r="3.5" />
        <Path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      </Svg>
    );
  },
  brief: (p: IconProps = {}) => {
    const { color, size = 22, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="7" width="18" height="13" rx="2" />
        <Path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
      </Svg>
    );
  },
  fam: (p: IconProps = {}) => {
    const { color, size = 22, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="9" cy="8" r="3" />
        <Circle cx="17" cy="9" r="2.5" />
        <Path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
        <Path d="M14 18c0-2 2-4 5-4" />
      </Svg>
    );
  },
  plane: (p: IconProps = {}) => {
    const { color, size = 22, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M2 16l20-8-9 13-2-6z" />
      </Svg>
    );
  },
  alert: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 2 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 3l10 18H2L12 3z" />
        <Path d="M12 10v5M12 18h.01" />
      </Svg>
    );
  },
  arrowDown: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 2 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 5v14M6 13l6 6 6-6" />
      </Svg>
    );
  },
  arrowUp: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 2 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 19V5M6 11l6-6 6 6" />
      </Svg>
    );
  },
  star: (p: IconProps = {}) => {
    const { color, size = 16 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round">
        <Path d="M12 3l3 6 6.5 1-4.7 4.6 1.1 6.4L12 18l-5.9 3 1.1-6.4L2.5 10 9 9z" />
      </Svg>
    );
  },
  syncErr: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 12a9 9 0 0115-6.7L21 8" />
        <Path d="M21 4v4h-4" />
        <Path d="M21 12a9 9 0 01-15 6.7L3 16" />
        <Path d="M3 20v-4h4" />
        <Path d="M12 9v4M12 16h.01" />
      </Svg>
    );
  },
  share: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="6" cy="12" r="2.5" />
        <Circle cx="18" cy="6" r="2.5" />
        <Circle cx="18" cy="18" r="2.5" />
        <Path d="M8.2 11l7.6-3.5M8.2 13l7.6 3.5" />
      </Svg>
    );
  },
  summary: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="4" y="3" width="16" height="18" rx="2" />
        <Path d="M8 9h8M8 13h8M8 17h5" />
      </Svg>
    );
  },
  bill: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
        <Path d="M9 8h6M9 12h6M9 16h4" />
      </Svg>
    );
  },
  info: (p: IconProps = {}) => {
    const { color, size = 12, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="9" />
        <Path d="M12 8v4M12 16h.01" />
      </Svg>
    );
  },
  gem: (p: IconProps = {}) => {
    const { color, size = 20, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 3h12l3 6-9 12L3 9z" />
        <Path d="M3 9h18" />
        <Path d="M12 3l-3 6 3 12 3-12-3-6z" />
      </Svg>
    );
  },
  bank: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 10l9-6 9 6" />
        <Path d="M5 10v9h14v-9" />
        <Path d="M9 19v-5M15 19v-5" />
      </Svg>
    );
  },
  vault: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="9" />
        <Circle cx="12" cy="12" r="4" />
      </Svg>
    );
  },
  link: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 17H7a5 5 0 010-10h2" />
        <Path d="M15 7h2a5 5 0 010 10h-2" />
        <Path d="M8 12h8" />
      </Svg>
    );
  },
  lock: (p: IconProps = {}) => {
    const { color, size = 12, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="5" y="11" width="14" height="9" rx="2" />
        <Path d="M8 11V8a4 4 0 018 0v3" />
      </Svg>
    );
  },
  sync: (p: IconProps = {}) => {
    const { color, size = 12, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 12a9 9 0 11-3-6.7" />
        <Path d="M21 4v5h-5" />
      </Svg>
    );
  },
  arrowR: (p: IconProps = {}) => {
    const { color, size = 12, strokeWidth = 2 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 12h14M13 5l7 7-7 7" />
      </Svg>
    );
  },
  arrowL: (p: IconProps = {}) => {
    const { color, size = 12, strokeWidth = 2 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M19 12H5M11 5l-7 7 7 7" />
      </Svg>
    );
  },
  search: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="11" cy="11" r="7" />
        <Path d="M21 21l-4.3-4.3" />
      </Svg>
    );
  },
  filter: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 5h18M6 12h12M10 19h4" />
      </Svg>
    );
  },
  edit: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />
      </Svg>
    );
  },
  split: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 5l6 6M19 5l-6 6M12 11v9" />
      </Svg>
    );
  },
  hide: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 3l18 18M10.6 6.1A9.7 9.7 0 0112 6c5 0 9 4.5 10 6-0.5 0.7-1.7 2.2-3.4 3.5M6.6 6.6C4.5 8 3 10.4 2 12c1 1.5 5 6 10 6 1.5 0 2.9-.4 4.2-1" />
      </Svg>
    );
  },
  note: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M14 4H6a2 2 0 00-2 2v14l4-3h10a2 2 0 002-2v-7" />
        <Path d="M18 4l2 2-6 6h-2v-2l6-6z" />
      </Svg>
    );
  },
  receipt: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z" />
        <Path d="M8 8h8M8 12h8M8 16h5" />
      </Svg>
    );
  },
  trash: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
      </Svg>
    );
  },
  flask: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 1.8 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 3h6M10 3v6L4 19c-1 2 0 3 2 3h12c2 0 3-1 2-3l-6-10V3" />
      </Svg>
    );
  },
  fork: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7 3v8a3 3 0 003 3v7M11 3v6M7 3v6M14 3l4 6v6h-4" />
      </Svg>
    );
  },
  car: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 17v-5l2-5h10l2 5v5" />
        <Path d="M3 17h18" />
        <Circle cx="7.5" cy="17.5" r="1.5" />
        <Circle cx="16.5" cy="17.5" r="1.5" />
      </Svg>
    );
  },
  shirt: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 7l4-4 4 2 4-2 4 4-3 3v11H7V10L4 7z" />
      </Svg>
    );
  },
  heart: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z" />
      </Svg>
    );
  },
  book: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 4h6a3 3 0 013 3v13a2 2 0 00-2-2H4V4zM20 4h-6a3 3 0 00-3 3v13a2 2 0 012-2h7V4z" />
      </Svg>
    );
  },
  paw: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="6" cy="10" r="2" />
        <Circle cx="10" cy="6" r="2" />
        <Circle cx="14" cy="6" r="2" />
        <Circle cx="18" cy="10" r="2" />
        <Path d="M8 17a4 4 0 018 0c0 2-2 3-4 3s-4-1-4-3z" />
      </Svg>
    );
  },
  doc: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 3h9l4 4v14H6z" />
        <Path d="M14 3v5h5M9 13h7M9 17h7" />
      </Svg>
    );
  },
  income: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 4v14M6 12l6 6 6-6" />
        <Path d="M4 21h16" />
      </Svg>
    );
  },
  transfer: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...defaultProps, ...p };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 7h13l-3-3M20 17H7l3 3" />
      </Svg>
    );
  },
};

export type IconKey = keyof typeof I;
