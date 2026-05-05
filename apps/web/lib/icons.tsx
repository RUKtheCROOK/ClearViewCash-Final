// Web parallel of @cvc/ui's icon set. Same names, same sizes — uses inline
// SVG so no react-native-svg dependency on the web side.

interface IconProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

const D = { color: "currentColor", size: 20, strokeWidth: 1.6 };

export const I = {
  bell: (p: IconProps = {}) => {
    const { color, size, strokeWidth } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 16V11a6 6 0 0112 0v5l1 2H5z" />
        <path d="M10 20a2 2 0 004 0" />
      </svg>
    );
  },
  gear: (p: IconProps = {}) => {
    const { color, size, strokeWidth } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 12.9a7.6 7.6 0 000-1.8l2-1.5-2-3.4-2.4.9a7 7 0 00-1.5-.9L15 3h-4l-.5 2.6a7 7 0 00-1.5.9l-2.4-.9-2 3.4 2 1.5a7.6 7.6 0 000 1.8l-2 1.5 2 3.4 2.4-.9a7 7 0 001.5.9l.5 2.6h4l.5-2.6a7 7 0 001.5-.9l2.4.9 2-3.4z" />
      </svg>
    );
  },
  chev: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 2 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    );
  },
  chevR: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 2 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
    );
  },
  send: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 5l7 7-7 7" />
      </svg>
    );
  },
  receive: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M11 5L4 12l7 7" />
      </svg>
    );
  },
  move: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 7h11l-3-3M17 17H6l3 3" />
      </svg>
    );
  },
  cart: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="17" cy="20" r="1.5" />
        <path d="M3 4h2l3 12h11l2-9H6" />
      </svg>
    );
  },
  bolt: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
      </svg>
    );
  },
  film: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 5v14M17 5v14M3 12h18" />
      </svg>
    );
  },
  coffee: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8h13v6a4 4 0 01-4 4H8a4 4 0 01-4-4z" />
        <path d="M17 10h2a2 2 0 010 4h-2" />
        <path d="M8 3v2M12 3v2" />
      </svg>
    );
  },
  home: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v10h14V10" />
      </svg>
    );
  },
  card: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 11h18" />
      </svg>
    );
  },
  spaces: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="4" />
        <circle cx="16" cy="15" r="4" />
      </svg>
    );
  },
  spark: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l5-6 4 4 5-7 4 5" />
      </svg>
    );
  },
  check: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 2.2 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l4 4 10-10" />
      </svg>
    );
  },
  close: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 2 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  },
  plus: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 2 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  },
  user: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="3.5" />
        <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      </svg>
    );
  },
  brief: (p: IconProps = {}) => {
    const { color, size = 22, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
      </svg>
    );
  },
  fam: (p: IconProps = {}) => {
    const { color, size = 22, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
        <path d="M14 18c0-2 2-4 5-4" />
      </svg>
    );
  },
  plane: (p: IconProps = {}) => {
    const { color, size = 22, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 16l20-8-9 13-2-6z" />
      </svg>
    );
  },
  alert: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 2 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l10 18H2L12 3z" />
        <path d="M12 10v5M12 18h.01" />
      </svg>
    );
  },
  arrowDown: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 2 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    );
  },
  arrowUp: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 2 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
    );
  },
  star: (p: IconProps = {}) => {
    const { color, size = 16 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M12 3l3 6 6.5 1-4.7 4.6 1.1 6.4L12 18l-5.9 3 1.1-6.4L2.5 10 9 9z" />
      </svg>
    );
  },
  syncErr: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0115-6.7L21 8" />
        <path d="M21 4v4h-4" />
        <path d="M21 12a9 9 0 01-15 6.7L3 16" />
        <path d="M3 20v-4h4" />
        <path d="M12 9v4M12 16h.01" />
      </svg>
    );
  },
  share: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M8.2 11l7.6-3.5M8.2 13l7.6 3.5" />
      </svg>
    );
  },
  summary: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  },
  bill: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  },
  info: (p: IconProps = {}) => {
    const { color, size = 12, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    );
  },
  gem: (p: IconProps = {}) => {
    const { color, size = 20, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l3 6-9 12L3 9z" />
        <path d="M3 9h18" />
        <path d="M12 3l-3 6 3 12 3-12-3-6z" />
      </svg>
    );
  },
  bank: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10l9-6 9 6" />
        <path d="M5 10v9h14v-9" />
        <path d="M9 19v-5M15 19v-5" />
      </svg>
    );
  },
  vault: (p: IconProps = {}) => {
    const { color, size = 18, strokeWidth = 1.6 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    );
  },
  link: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 17H7a5 5 0 010-10h2" />
        <path d="M15 7h2a5 5 0 010 10h-2" />
        <path d="M8 12h8" />
      </svg>
    );
  },
  lock: (p: IconProps = {}) => {
    const { color, size = 12, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </svg>
    );
  },
  sync: (p: IconProps = {}) => {
    const { color, size = 12, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 11-3-6.7" />
        <path d="M21 4v5h-5" />
      </svg>
    );
  },
  arrowR: (p: IconProps = {}) => {
    const { color, size = 12, strokeWidth = 2 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 5l7 7-7 7" />
      </svg>
    );
  },
  arrowL: (p: IconProps = {}) => {
    const { color, size = 12, strokeWidth = 2 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M11 5l-7 7 7 7" />
      </svg>
    );
  },
  search: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    );
  },
  filter: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h18M6 12h12M10 19h4" />
      </svg>
    );
  },
  edit: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />
      </svg>
    );
  },
  split: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 5l6 6M19 5l-6 6M12 11v9" />
      </svg>
    );
  },
  hide: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18M10.6 6.1A9.7 9.7 0 0112 6c5 0 9 4.5 10 6-0.5 0.7-1.7 2.2-3.4 3.5M6.6 6.6C4.5 8 3 10.4 2 12c1 1.5 5 6 10 6 1.5 0 2.9-.4 4.2-1" />
      </svg>
    );
  },
  note: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4H6a2 2 0 00-2 2v14l4-3h10a2 2 0 002-2v-7" />
        <path d="M18 4l2 2-6 6h-2v-2l6-6z" />
      </svg>
    );
  },
  receipt: (p: IconProps = {}) => {
    const { color, size = 14, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  },
  trash: (p: IconProps = {}) => {
    const { color, size = 16, strokeWidth = 1.8 } = { ...D, ...p };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
      </svg>
    );
  },
};

export type IconKey = keyof typeof I;
