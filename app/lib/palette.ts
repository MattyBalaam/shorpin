// Palette strategies ported from delphitools' Palette Generator (0BSD):
// https://github.com/1612elphi/delphitools/blob/main/app/lib/palette-strategies.ts
//
// Strategies generate colours in OKLCH, then `toBackground` lifts them into a
// light band so the theme's black text stays readable on any result.

type Oklch = { L: number; c: number; h: number };
type Range = [min: number, max: number];

// Hue ranges may exceed 360 to express a wrap through red, e.g. [350, 380].
type WeightedRange = { h: Range; L: Range; c: Range; weight: number };

// Lightness band every theme colour is mapped into. Measured against black
// text across the full hue circle: even the darkest end (L 0.65) keeps a
// worst-case ~5.5:1 contrast (blue/violet hues), well past WCAG AA's 4.5:1.
// Deliberately not pushed lighter than this — max in-gamut chroma for warm
// and cool hues falls off sharply above ~L 0.75 (a hue can be light *or*
// vivid, rarely both), so staying closer to 0.65 is what keeps colours
// looking like colours instead of pastel. Capped at 0.85, short of the
// gamut's near-white extreme, for the same reason.
export const BACKGROUND_L: Range = [0.65, 0.85];

// Lightness band for the dark-mode variant. Measured against white text: even
// the top of this band (L 0.48) keeps ~5.8:1 contrast worst-case (green/blue
// hues), well past WCAG AA's 4.5:1, and it's light enough that max in-gamut
// chroma here rivals — often exceeds — what BACKGROUND_L allows, so the dark
// variant can stay vivid instead of fading to grey near black.
export const DARK_BACKGROUND_L: Range = [0.35, 0.48];

// Generous ceiling for the dark-mode chroma search (light mode instead uses
// each strategy's own requested chroma as the ceiling, preserving the
// intentionally muted look of strategies like "telegraph" or "scandinavian" —
// dark mode has no such per-strategy intent to preserve, so it always aims
// for maximum vividness). Actual chroma is always clamped to whatever's
// in-gamut for the given L/h; this just bounds the search (see delphitools'
// own clampOklch, which uses the same ceiling).
const DARK_CHROMA_CEILING = 0.4;

// Minimum OKLab distance between primary and secondary so the two stay
// distinguishable after lightness compression.
const MIN_DISTANCE = 0.04;
const MAX_ATTEMPTS = 20;

function randomIn([min, max]: Range) {
  return Math.random() * (max - min) + min;
}

function jitter(value: number, amount: number) {
  return value + randomIn([-amount, amount]);
}

function pickWeighted(ranges: WeightedRange[]): Oklch {
  let roll = Math.random() * ranges.reduce((sum, r) => sum + r.weight, 0);
  const range = ranges.find((r) => (roll -= r.weight) <= 0) ?? ranges[0];
  return { h: randomIn(range.h), L: randomIn(range.L), c: randomIn(range.c) };
}

function randomBase(): Oklch {
  return { L: randomIn([0.4, 0.75]), c: randomIn([0.08, 0.2]), h: randomIn([0, 360]) };
}

// Colour-theory strategies: hues at fixed offsets from a random base.
function harmony(offsets: number[], hueJitter: number) {
  return (count: number) => {
    const base = randomBase();
    return Array.from({ length: count }, (_, i) => ({
      h: jitter(base.h + offsets[i % offsets.length], hueJitter),
      L: jitter(base.L, 0.15),
      c: jitter(base.c, 0.05),
    }));
  };
}

function analogous(count: number) {
  const base = randomBase();
  const spread = 40;
  return Array.from({ length: count }, (_, i) => ({
    h: base.h - spread / 2 + (spread / Math.max(count - 1, 1)) * i,
    L: jitter(base.L, 0.1),
    c: jitter(base.c, 0.05),
  }));
}

function complementary(count: number) {
  const base = randomBase();
  const half = Math.ceil(count / 2);
  return Array.from({ length: count }, (_, i) => ({
    h: jitter(base.h + (i < half ? 0 : 180), 15),
    L: jitter(base.L, 0.15),
    c: jitter(base.c, 0.05),
  }));
}

function monochromatic(count: number) {
  const h = randomIn([0, 360]);
  const c = randomIn([0.1, 0.2]);
  const [min, max] = [0.3, 0.85];
  return Array.from({ length: count }, (_, i) => {
    const L = max - ((max - min) / Math.max(count - 1, 1)) * i;
    return { h, L, c: L < 0.4 || L > 0.75 ? c * 0.7 : c };
  });
}

// Mood, era, nature and culture strategies: weighted hue/lightness/chroma
// ranges sampled independently per colour.
const scenes = {
  thermos: [{ h: [15, 55], L: [0.45, 0.75], c: [0.08, 0.18], weight: 1 }],
  specimen: [{ h: [170, 220], L: [0.6, 0.9], c: [0.03, 0.12], weight: 1 }],
  souvenir: [{ h: [0, 360], L: [0.75, 0.92], c: [0.04, 0.1], weight: 1 }],
  telegraph: [{ h: [30, 60], L: [0.4, 0.7], c: [0.02, 0.08], weight: 1 }],
  "70s": [
    { h: [25, 45], L: [0.35, 0.65], c: [0.08, 0.18], weight: 3 },
    { h: [75, 100], L: [0.35, 0.65], c: [0.08, 0.18], weight: 2 },
    { h: [15, 30], L: [0.35, 0.65], c: [0.08, 0.18], weight: 2 },
    { h: [45, 65], L: [0.35, 0.65], c: [0.08, 0.18], weight: 1 },
  ],
  "80s": [
    { h: [0, 360], L: [0.12, 0.22], c: [0.02, 0.08], weight: 20 },
    { h: [320, 350], L: [0.55, 0.75], c: [0.18, 0.3], weight: 30 },
    { h: [220, 270], L: [0.55, 0.75], c: [0.18, 0.3], weight: 20 },
    { h: [280, 320], L: [0.55, 0.75], c: [0.18, 0.3], weight: 20 },
    { h: [170, 200], L: [0.55, 0.75], c: [0.18, 0.3], weight: 10 },
  ],
  "90s": [
    { h: [140, 170], L: [0.3, 0.55], c: [0.05, 0.14], weight: 2 },
    { h: [350, 380], L: [0.3, 0.55], c: [0.05, 0.14], weight: 2 },
    { h: [220, 250], L: [0.3, 0.55], c: [0.05, 0.14], weight: 2 },
    { h: [30, 50], L: [0.3, 0.55], c: [0.05, 0.14], weight: 1 },
  ],
  y2k: [
    { h: [200, 280], L: [0.7, 0.88], c: [0.01, 0.04], weight: 18 },
    { h: [180, 200], L: [0.55, 0.75], c: [0.15, 0.28], weight: 14 },
    { h: [310, 340], L: [0.55, 0.75], c: [0.15, 0.28], weight: 14 },
    { h: [260, 290], L: [0.55, 0.75], c: [0.15, 0.28], weight: 7 },
    { h: [50, 70], L: [0.55, 0.75], c: [0.15, 0.28], weight: 7 },
  ],
  oceanSunset: [
    { h: [15, 40], L: [0.6, 0.75], c: [0.1, 0.2], weight: 2 },
    { h: [340, 360], L: [0.55, 0.7], c: [0.1, 0.2], weight: 2 },
    { h: [200, 230], L: [0.35, 0.55], c: [0.1, 0.2], weight: 2 },
    { h: [260, 290], L: [0.25, 0.45], c: [0.1, 0.2], weight: 1 },
  ],
  forestMorning: [
    { h: [90, 150], L: [0.8, 0.92], c: [0.02, 0.06], weight: 7 },
    { h: [100, 140], L: [0.4, 0.7], c: [0.08, 0.18], weight: 9 },
    { h: [75, 100], L: [0.4, 0.7], c: [0.08, 0.18], weight: 6 },
    { h: [45, 60], L: [0.4, 0.7], c: [0.08, 0.18], weight: 3 },
    { h: [25, 40], L: [0.4, 0.7], c: [0.08, 0.18], weight: 3 },
  ],
  desertDusk: [
    { h: [15, 35], L: [0.45, 0.65], c: [0.06, 0.16], weight: 3 },
    { h: [40, 55], L: [0.7, 0.85], c: [0.06, 0.16], weight: 2 },
    { h: [350, 375], L: [0.55, 0.7], c: [0.06, 0.16], weight: 2 },
    { h: [280, 310], L: [0.25, 0.4], c: [0.06, 0.16], weight: 1 },
  ],
  arctic: [
    { h: [200, 220], L: [0.92, 0.98], c: [0.005, 0.02], weight: 18 },
    { h: [200, 220], L: [0.7, 0.9], c: [0.02, 0.08], weight: 21 },
    { h: [180, 200], L: [0.7, 0.9], c: [0.02, 0.08], weight: 14 },
    { h: [220, 250], L: [0.7, 0.9], c: [0.02, 0.08], weight: 7 },
  ],
  volcanic: [
    { h: [0, 360], L: [0.12, 0.22], c: [0.01, 0.03], weight: 25 },
    { h: [20, 40], L: [0.5, 0.65], c: [0.01, 0.03], weight: 15 },
    { h: [0, 20], L: [0.4, 0.65], c: [0.15, 0.25], weight: 24 },
    { h: [20, 45], L: [0.4, 0.65], c: [0.15, 0.25], weight: 24 },
    { h: [45, 60], L: [0.4, 0.65], c: [0.15, 0.25], weight: 12 },
  ],
  meadow: [
    { h: [100, 135], L: [0.55, 0.75], c: [0.12, 0.22], weight: 3 },
    { h: [280, 320], L: [0.55, 0.75], c: [0.12, 0.22], weight: 2 },
    { h: [55, 75], L: [0.55, 0.75], c: [0.12, 0.22], weight: 2 },
    { h: [200, 220], L: [0.55, 0.75], c: [0.12, 0.22], weight: 1 },
  ],
  bauhaus: [
    { h: [0, 360], L: [0.08, 0.18], c: [0, 0.02], weight: 24 },
    { h: [80, 100], L: [0.92, 0.97], c: [0.01, 0.025], weight: 12 },
    { h: [15, 35], L: [0.5, 0.62], c: [0.18, 0.26], weight: 21 },
    { h: [85, 105], L: [0.8, 0.88], c: [0.14, 0.2], weight: 21 },
    { h: [240, 265], L: [0.4, 0.52], c: [0.12, 0.18], weight: 21 },
    { h: [35, 55], L: [0.65, 0.75], c: [0.15, 0.2], weight: 7 },
    { h: [140, 160], L: [0.45, 0.55], c: [0.1, 0.15], weight: 7 },
    { h: [0, 15], L: [0.45, 0.55], c: [0.2, 0.26], weight: 7 },
  ],
  artDeco: [
    { h: [85, 100], L: [0.7, 0.8], c: [0.12, 0.18], weight: 100 },
    { h: [0, 360], L: [0.12, 0.2], c: [0.01, 0.03], weight: 60 },
    { h: [80, 100], L: [0.9, 0.96], c: [0.015, 0.03], weight: 60 },
    { h: [155, 175], L: [0.35, 0.55], c: [0.1, 0.18], weight: 90 },
    { h: [180, 200], L: [0.35, 0.55], c: [0.1, 0.18], weight: 45 },
    { h: [0, 15], L: [0.35, 0.55], c: [0.1, 0.18], weight: 45 },
  ],
  japanese: [
    { h: [70, 100], L: [0.88, 0.95], c: [0.01, 0.03], weight: 39 },
    { h: [35, 60], L: [0.4, 0.55], c: [0.05, 0.1], weight: 26 },
    { h: [245, 270], L: [0.25, 0.45], c: [0.06, 0.14], weight: 45 },
    { h: [18, 35], L: [0.45, 0.58], c: [0.14, 0.22], weight: 30 },
    { h: [0, 18], L: [0.35, 0.48], c: [0.12, 0.18], weight: 15 },
    { h: [75, 95], L: [0.7, 0.82], c: [0.1, 0.16], weight: 30 },
    { h: [120, 145], L: [0.35, 0.5], c: [0.06, 0.12], weight: 30 },
    { h: [290, 320], L: [0.5, 0.7], c: [0.08, 0.14], weight: 15 },
    { h: [340, 360], L: [0.75, 0.88], c: [0.06, 0.12], weight: 15 },
    { h: [35, 50], L: [0.55, 0.68], c: [0.12, 0.18], weight: 15 },
  ],
  scandinavian: [
    { h: [80, 110], L: [0.93, 0.98], c: [0.005, 0.015], weight: 35 },
    { h: [200, 260], L: [0.8, 0.9], c: [0.005, 0.015], weight: 20 },
    { h: [0, 360], L: [0.8, 0.9], c: [0.02, 0.05], weight: 20 },
    { h: [50, 80], L: [0.55, 0.7], c: [0.04, 0.08], weight: 25 },
  ],
  mexican: [
    { h: [330, 350], L: [0.55, 0.72], c: [0.18, 0.28], weight: 2 },
    { h: [20, 40], L: [0.55, 0.72], c: [0.18, 0.28], weight: 2 },
    { h: [175, 195], L: [0.55, 0.72], c: [0.18, 0.28], weight: 2 },
    { h: [55, 70], L: [0.55, 0.72], c: [0.18, 0.28], weight: 2 },
    { h: [280, 310], L: [0.55, 0.72], c: [0.18, 0.28], weight: 1 },
  ],
} satisfies Record<string, WeightedRange[]>;

const scatter = (ranges: WeightedRange[]) => (count: number) =>
  Array.from({ length: count }, () => pickWeighted(ranges));

export const strategies = {
  analogous,
  complementary,
  monochromatic,
  triadic: harmony([0, 120, 240], 10),
  splitComplementary: harmony([0, 150, 210], 10),
  tetradic: harmony([0, 90, 180, 270], 10),
  ...(Object.fromEntries(
    Object.entries(scenes).map(([name, ranges]) => [name, scatter(ranges)]),
  ) as Record<keyof typeof scenes, (count: number) => Oklch[]>),
} satisfies Record<string, (count: number) => Oklch[]>;

export type PaletteStrategy = keyof typeof strategies;

function toLinearSrgb({ L, c, h }: Oklch) {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function inSrgbGamut(colour: Oklch) {
  return toLinearSrgb(colour).every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4);
}

// toCss() rounds L/c/h to 3/3/1 decimal places, which can round a boundary
// chroma just past the gamut edge; margin keeps the emitted value safely
// inside it. (Harmless either way — browsers gamut-map oklch() on render —
// but there's no reason to sit exactly on the edge.)
const GAMUT_MARGIN = 0.001;

// Binary-searches the highest in-gamut chroma at this L/h, up to `ceiling`,
// so a colour keeps as much of its hue's saturation as sRGB allows instead of
// being clipped (and hue-distorted) per channel.
function maxChromaInGamut(L: number, h: number, ceiling: number): number {
  if (inSrgbGamut({ L, c: ceiling, h })) return ceiling;

  let [low, high] = [0, ceiling];
  while (high - low > 0.001) {
    const mid = (low + high) / 2;
    if (inSrgbGamut({ L, c: mid, h })) low = mid;
    else high = mid;
  }
  return Math.max(low - GAMUT_MARGIN, 0);
}

function remapLightness(L: number, band: Range) {
  const [min, max] = band;
  return min + Math.min(Math.max(L, 0), 1) * (max - min);
}

// Remap lightness into the background band (preserving relative ordering so
// strategies with light/dark contrast keep it), then fit chroma to the band's
// gamut so the hue isn't distorted by per-channel clipping.
export function toBackground({ L, c, h }: Oklch): Oklch {
  const hue = ((h % 360) + 360) % 360;
  const targetL = remapLightness(L, BACKGROUND_L);
  return { L: targetL, c: maxChromaInGamut(targetL, hue, Math.max(c, 0)), h: hue };
}

function distance(x: Oklch, y: Oklch) {
  const toLab = ({ L, c, h }: Oklch) => {
    const rad = (h * Math.PI) / 180;
    return [L, c * Math.cos(rad), c * Math.sin(rad)];
  };
  const [a, b] = [toLab(x), toLab(y)];
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function toCss({ L, c, h }: Oklch) {
  return `oklch(${L.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

function parseOklchCss(css: string): Oklch | null {
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/i.exec(css);
  if (!match) return null;
  return { L: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

// Maps a light theme colour into DARK_BACKGROUND_L at the same relative
// lightness, then fits chroma independently against DARK_CHROMA_CEILING
// rather than scaling the light colour's own (already gamut-reduced) chroma
// down — that's what keeps the dark variant vivid instead of washed out.
function toDarkOklch({ L, h }: Oklch): Oklch {
  const relativeL = (L - BACKGROUND_L[0]) / (BACKGROUND_L[1] - BACKGROUND_L[0]);
  const targetL = remapLightness(relativeL, DARK_BACKGROUND_L);
  return { L: targetL, c: maxChromaInGamut(targetL, h, DARK_CHROMA_CEILING), h };
}

// Only oklch() strings (i.e. anything toBackground produced) carry the L/c/h
// this needs to stay vivid. Older stored values (the pre-OKLCH hsl()
// generator) fall back to a plain mix toward black, which still works for
// any CSS colour notation even though it's less vivid.
export function toDarkModeCss(css: string) {
  const parsed = parseOklchCss(css);
  return parsed ? toCss(toDarkOklch(parsed)) : `color-mix(in oklch, ${css} 30%, black)`;
}

// `color-scheme: dark` is only ever set when the OS prefers dark (see
// app.css), so light-dark() here tracks that preference correctly.
export function toAdaptiveCss(lightCss: string) {
  return `light-dark(${lightCss}, ${toDarkModeCss(lightCss)})`;
}

const strategyNames = Object.keys(strategies) as PaletteStrategy[];

export function generateThemeColors(
  strategy = strategyNames[Math.floor(Math.random() * strategyNames.length)],
) {
  let pair: Oklch[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    pair = strategies[strategy](2).map(toBackground);
    if (distance(pair[0], pair[1]) >= MIN_DISTANCE) break;
  }
  const [primary, secondary] = pair.map(toCss);
  return { primary, secondary, strategy };
}
