// OKLCH colour conversion for list themes: lifting a colour into the
// background band, its dark-mode variant, and their CSS. The random palette
// generator is in palette-generator.ts, loaded only when the picker opens.

export type Oklch = { L: number; c: number; h: number };
export type Range = [min: number, max: number];

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

// Generous ceiling for gamut chroma searches. Actual chroma is always clamped
// to whatever's in-gamut for the given L/h; this just bounds the search (see
// delphitools' own clampOklch, which uses the same ceiling).
const CHROMA_CEILING = 0.4;

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

export function toCss({ L, c, h }: Oklch) {
  return `oklch(${L.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

function parseOklchCss(css: string): Oklch | null {
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/i.exec(css);
  if (!match) return null;
  return { L: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

// Maps a light theme colour into DARK_BACKGROUND_L at the same relative
// lightness, keeping its saturation relative to the gamut: a colour at its
// hue's sRGB limit stays at the limit in dark mode, and a near-grey (e.g.
// "scandinavian") stays near-grey. Copying absolute chroma instead would wash
// out hues whose gamut widens when darker (blues); always maxing it out made
// muted colours garish and the two schemes look unrelated.
function toDarkOklch({ L, c, h }: Oklch): Oklch {
  const relativeL = (L - BACKGROUND_L[0]) / (BACKGROUND_L[1] - BACKGROUND_L[0]);
  const targetL = remapLightness(relativeL, DARK_BACKGROUND_L);
  const lightMax = maxChromaInGamut(L, h, CHROMA_CEILING);
  const saturation = lightMax > 0 ? Math.min(c / lightMax, 1) : 0;
  return { L: targetL, c: saturation * maxChromaInGamut(targetL, h, CHROMA_CEILING), h };
}

// Only oklch() strings (i.e. anything toBackground produced) carry the L/c/h
// this needs to stay vivid. Older stored values (the pre-OKLCH hsl()
// generator) fall back to a plain mix toward black, which still works for
// any CSS colour notation even though it's less vivid.
export function toDarkModeCss(css: string) {
  const parsed = parseOklchCss(css);
  return parsed ? toCss(toDarkOklch(parsed)) : `color-mix(in oklch, ${css} 30%, black)`;
}

// `color-scheme` is only ever a single scheme, the OS's or the device's
// pinned choice (see reset.css.ts), so light-dark() here tracks it correctly.
export function toAdaptiveCss(lightCss: string) {
  return `light-dark(${lightCss}, ${toDarkModeCss(lightCss)})`;
}
