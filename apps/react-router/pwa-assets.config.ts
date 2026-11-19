import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Regenerate with `pnpm generate-pwa-assets` after changing the source icon.
// Outputs land next to the source in public/icons/ (the script then moves
// favicon.ico to public/, where browsers look for it) and are committed; the
// manifest (public/manifest.webmanifest) and <head> links (app/root.tsx) are
// hand-maintained to match.

// Matches the manifest's theme/background colour. The source glyph is
// near-white on transparent, so padded icons need a solid backdrop: iOS fills
// transparent apple-touch-icons with black, and Android masks crop to the
// central safe zone.
const background = "#A9CBB7";

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { sizes: [192, 512], favicons: [[48, "favicon.ico"]] },
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ["public/icons/icon.png"],
});
