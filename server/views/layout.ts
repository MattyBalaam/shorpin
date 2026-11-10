import type { AppStyle } from "../../lib/app-style.ts";
import type { ColorScheme } from "../../lib/color-scheme.ts";
import { assetUrl, importedChunks, type ScriptEntry } from "../assets.ts";
import { type Html, html } from "../html.ts";

export interface DocumentOptions {
  title: string;
  appStyle: AppStyle;
  colorScheme: ColorScheme;
  /** The request path; base.ts echoes it as data-hydrated-path once enhanced. */
  path: string;
  body: Html;
  /** Extra <head> content, e.g. a list's palette. */
  head?: Html;
  /** Enhancement scripts beyond base, which every page gets. */
  scripts?: ScriptEntry[];
}

/**
 * The whole page. There's no client-side rendering: the markup below is the
 * app, and the only scripts are small, deferred modules that enhance it.
 */
export function document({
  title,
  appStyle,
  colorScheme,
  path,
  body,
  head,
  scripts = [],
}: DocumentOptions) {
  const entries: ScriptEntry[] = ["base", ...scripts];
  const preloads = [...new Set(entries.flatMap(importedChunks))];

  return html`<!doctype html>
    <html
      lang="en"
      data-app-style="${appStyle}"
      data-color-scheme="${colorScheme}"
      data-path="${path}"
    >
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <title>${title}</title>
        <meta name="theme-color" content="#0fc1e5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Shorpin" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />
        <link rel="stylesheet" href="${assetUrl("styles")}" />
        <script>
          // Must be inline: pagereveal fires before deferred modules run. base.ts
          // waits on it so "enhanced" also means the page has finished arriving.
          addEventListener("pagereveal", (e) => (self.pageRevealed = e.viewTransition?.finished));
        </script>
        ${preloads.map((href) => html`<link rel="modulepreload" href="${href}" />`)}
        ${entries.map((entry) => html`<script type="module" src="${assetUrl(entry)}"></script>`)}
        ${head ?? ""}
      </head>
      <body>
        <div aria-hidden="true" class="status-bar-backdrop"></div>
        <main class="page">${body}</main>
      </body>
    </html>`;
}
