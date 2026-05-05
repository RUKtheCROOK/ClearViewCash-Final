// One-off: convert design's OKLch tokens to sRGB hex for the mobile palette.
// Run: node scripts/oklch-to-hex.mjs

function oklchToHex(L, C, H) {
  const lab_a = C * Math.cos((H * Math.PI) / 180);
  const lab_b = C * Math.sin((H * Math.PI) / 180);

  const l_ = L + 0.3963377774 * lab_a + 0.2158037573 * lab_b;
  const m_ = L - 0.1055613458 * lab_a - 0.0638541728 * lab_b;
  const s_ = L - 0.0894841775 * lab_a - 1.2914855480 * lab_b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  let R = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let G = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let B = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toGamma = (c) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  R = toGamma(R);
  G = toGamma(G);
  B = toGamma(B);

  const clamp = (c) => Math.max(0, Math.min(1, c));
  const hex = (c) =>
    Math.round(clamp(c) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${hex(R)}${hex(G)}${hex(B)}`;
}

const tokens = {
  light: {
    canvas: [0.985, 0.005, 90],
    surface: [1.0, 0.0, 0],
    sunken: [0.96, 0.006, 90],
    tinted: [0.94, 0.008, 90],
    line: [0.92, 0.006, 90],
    lineFirm: [0.86, 0.008, 90],
    ink1: [0.20, 0.015, 220],
    ink2: [0.42, 0.012, 220],
    ink3: [0.58, 0.010, 220],
    ink4: [0.72, 0.008, 220],
    brand: [0.36, 0.045, 195],
    brandHover: [0.31, 0.045, 195],
    brandTint: [0.95, 0.020, 195],
    brandOn: [0.98, 0.005, 90],
    accent: [0.72, 0.130, 75],
    accentTint: [0.95, 0.030, 75],
    pos: [0.48, 0.090, 155],
    posTint: [0.95, 0.030, 155],
    neg: [0.50, 0.130, 25],
    negTint: [0.95, 0.030, 25],
    warn: [0.62, 0.140, 65],
    warnTint: [0.95, 0.030, 65],
    info: [0.50, 0.090, 240],
    infoTint: [0.95, 0.025, 240],
    projected: [0.58, 0.010, 220],
    projectedTint: [0.94, 0.006, 220],
    skeleton: [0.94, 0.006, 90],
    skeletonHi: [0.96, 0.006, 90],
  },
  dark: {
    canvas: [0.16, 0.012, 240],
    surface: [0.20, 0.014, 240],
    sunken: [0.14, 0.012, 240],
    tinted: [0.24, 0.016, 240],
    line: [0.26, 0.014, 240],
    lineFirm: [0.32, 0.016, 240],
    ink1: [0.96, 0.005, 240],
    ink2: [0.75, 0.010, 240],
    ink3: [0.60, 0.012, 240],
    ink4: [0.46, 0.012, 240],
    brand: [0.72, 0.075, 195],
    brandHover: [0.78, 0.075, 195],
    brandTint: [0.28, 0.040, 195],
    brandOn: [0.18, 0.012, 240],
    accent: [0.78, 0.120, 75],
    accentTint: [0.30, 0.050, 75],
    pos: [0.72, 0.110, 155],
    posTint: [0.28, 0.045, 155],
    neg: [0.70, 0.140, 25],
    negTint: [0.30, 0.050, 25],
    warn: [0.78, 0.130, 65],
    warnTint: [0.30, 0.050, 65],
    info: [0.72, 0.090, 240],
    infoTint: [0.28, 0.040, 240],
    projected: [0.60, 0.012, 240],
    projectedTint: [0.24, 0.012, 240],
    skeleton: [0.24, 0.012, 240],
    skeletonHi: [0.28, 0.012, 240],
  },
};

const spaceHues = {
  personal: 195,
  household: 30,
  business: 270,
  family: 145,
  travel: 220,
};

const categoryHues = {
  groceries: 145,
  dining: 30,
  transport: 240,
  utilities: 75,
  income: 195,
  shopping: 285,
  health: 5,
  subs: 320,
  transfer: 220,
};

const spaceTint = (h, mode) =>
  mode === "dark"
    ? {
        wash: oklchToHex(0.24, 0.030, h),
        pillBg: oklchToHex(0.30, 0.050, h),
        pillFg: oklchToHex(0.85, 0.080, h),
        edge: oklchToHex(0.40, 0.060, h),
        swatch: oklchToHex(0.60, 0.080, h),
      }
    : {
        wash: oklchToHex(0.96, 0.020, h),
        pillBg: oklchToHex(0.92, 0.035, h),
        pillFg: oklchToHex(0.35, 0.060, h),
        edge: oklchToHex(0.80, 0.045, h),
        swatch: oklchToHex(0.60, 0.080, h),
      };

const out = {
  light: {},
  dark: {},
  spaces: { light: {}, dark: {} },
  categories: { light: {}, dark: {} },
};
for (const mode of ["light", "dark"]) {
  for (const [k, v] of Object.entries(tokens[mode])) {
    out[mode][k] = oklchToHex(v[0], v[1], v[2]);
  }
  for (const [name, h] of Object.entries(spaceHues)) {
    out.spaces[mode][name] = spaceTint(h, mode);
  }
  for (const [name, h] of Object.entries(categoryHues)) {
    out.categories[mode][name] = spaceTint(h, mode);
  }
}

console.log(JSON.stringify(out, null, 2));
