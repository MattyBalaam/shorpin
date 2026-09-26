import { describe, expect, test } from "vitest";
import {
  BACKGROUND_L,
  DARK_BACKGROUND_L,
  generateThemeColors,
  inSrgbGamut,
  strategies,
  toAdaptiveCss,
  toBackground,
  toCss,
  toDarkModeCss,
  type PaletteStrategy,
} from "./palette";

const OKLCH = /^oklch\((\d\.\d{3}) (\d\.\d{3}) (\d{1,3}\.\d)\)$/;

function parse(css: string) {
  const match = css.match(OKLCH);
  if (!match) throw new Error(`Not an oklch() string: ${css}`);
  const [, L, c, h] = match.map(Number);
  return { L, c, h };
}

describe("toBackground", () => {
  test("lifts dark colours into the light band", () => {
    expect(toBackground({ L: 0.1, c: 0.02, h: 30 }).L).toBeGreaterThanOrEqual(BACKGROUND_L[0]);
  });

  test("preserves relative lightness ordering", () => {
    const dark = toBackground({ L: 0.3, c: 0.05, h: 200 });
    const light = toBackground({ L: 0.8, c: 0.05, h: 200 });
    expect(light.L).toBeGreaterThan(dark.L);
  });

  test("reduces out-of-gamut chroma without changing hue", () => {
    const colour = toBackground({ L: 0.6, c: 0.3, h: 340 });
    expect(inSrgbGamut(colour)).toBe(true);
    expect(colour.c).toBeLessThan(0.3);
    expect(colour.h).toBe(340);
  });

  test("normalises wrapped hues", () => {
    expect(toBackground({ L: 0.5, c: 0.05, h: 370 }).h).toBeCloseTo(10);
  });
});

describe("generateThemeColors", () => {
  test.each(Object.keys(strategies) as PaletteStrategy[])(
    "%s produces light, in-gamut oklch colours",
    (strategy) => {
      for (let i = 0; i < 50; i++) {
        const colors = generateThemeColors(strategy);
        expect(colors.strategy).toBe(strategy);
        for (const css of [colors.primary, colors.secondary]) {
          const colour = parse(css);
          expect(colour.L).toBeGreaterThanOrEqual(BACKGROUND_L[0]);
          expect(colour.L).toBeLessThanOrEqual(BACKGROUND_L[1]);
          expect(colour.h).toBeGreaterThanOrEqual(0);
          expect(colour.h).toBeLessThan(360.05);
        }
      }
    },
  );

  test("picks a random strategy when none is given", () => {
    expect(Object.keys(strategies)).toContain(generateThemeColors().strategy);
  });
});

describe("toDarkModeCss / toAdaptiveCss", () => {
  test("derives an in-gamut, comparably vivid dark oklch() from a light one", () => {
    const light = parse(toCss(toBackground({ L: 0.6, c: 0.2, h: 250 })));
    const dark = parse(toDarkModeCss(toCss(light)));
    expect(dark.L).toBeGreaterThanOrEqual(DARK_BACKGROUND_L[0]);
    expect(dark.L).toBeLessThanOrEqual(DARK_BACKGROUND_L[1]);
    expect(dark.h).toBeCloseTo(light.h, 0);
    // The whole point of gamut-fitting independently (rather than scaling
    // the light colour's chroma down) is that the dark variant isn't washed
    // out relative to the light one.
    expect(dark.c).toBeGreaterThan(light.c * 0.7);
  });

  test.each(Object.keys(strategies) as PaletteStrategy[])(
    "%s's dark variant is in-gamut and keeps white-text contrast",
    (strategy) => {
      for (let i = 0; i < 20; i++) {
        const light = toBackground(strategies[strategy](1)[0]);
        const dark = parse(toDarkModeCss(toCss(light)));
        expect(inSrgbGamut(dark)).toBe(true);
        // Measured worst case (green/blue hues) is ~5.8:1 at L 0.48 — see
        // DARK_BACKGROUND_L's comment in palette.ts.
        expect(dark.L).toBeLessThanOrEqual(DARK_BACKGROUND_L[1]);
      }
    },
  );

  test("falls back to a plain mix for non-oklch (e.g. legacy hsl) values", () => {
    expect(toDarkModeCss("hsl(210, 50%, 80%)")).toBe(
      "color-mix(in oklch, hsl(210, 50%, 80%) 30%, black)",
    );
  });

  test("wraps light and dark values in a light-dark() call", () => {
    const light = toCss(toBackground({ L: 0.6, c: 0.2, h: 250 }));
    expect(toAdaptiveCss(light)).toBe(`light-dark(${light}, ${toDarkModeCss(light)})`);
  });
});
