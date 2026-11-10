import { type ColorScheme, colorSchemes } from "../../lib/color-scheme.ts";
import type { Flash } from "../flash.ts";
import { cx, type Html, html, raw } from "../html.ts";

// Small view helpers shared by every page. Each returns escaped HTML; class
// names match client/styles/app.css.

// --- Icons (decorative: the control's text stays its accessible name) ---

function icon(paths: string) {
  return raw(
    `<svg aria-hidden="true" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`,
  );
}

export const icons = {
  brush: icon(
    '<path d="m11 10 3 3"/><path d="M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z"/><path d="M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031"/>',
  ),
  palette: icon(
    '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
  ),
  sun: icon(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  ),
  moon: icon(
    '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
  ),
  power: icon('<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>'),
  contrast: icon(
    '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  ),
  group: icon('<path d="M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13"/>'),
  grip: raw(
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="9" cy="6" r="1.75"/><circle cx="15" cy="6" r="1.75"/><circle cx="9" cy="12" r="1.75"/><circle cx="15" cy="12" r="1.75"/><circle cx="9" cy="18" r="1.75"/><circle cx="15" cy="18" r="1.75"/></svg>',
  ),
  cog: raw(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.51.41 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.22 1.12-.53 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"/></svg>',
  ),
  edit: raw(
    '<svg aria-hidden="true" class="item-edit-icon" viewBox="0 0 24 24" fill="none"><path d="M4 20H8L18.5 9.5C19.6 8.4 19.6 6.6 18.5 5.5C17.4 4.4 15.6 4.4 14.5 5.5L4 16V20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 6.5L17.5 10.5" stroke="currentColor" stroke-width="2"/></svg>',
  ),
  link: raw(
    '<svg aria-hidden="true" class="item-link-icon" viewBox="0 0 24 24" fill="none"><path d="M14 5H19V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 14L19 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 14V18C19 19.1 18.1 20 17 20H6C4.9 20 4 19.1 4 18V7C4 5.9 4.9 5 6 5H10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ),
  undo: raw(
    '<svg aria-hidden="true" class="list-undo-icon" viewBox="0 0 24 24" fill="none"><path d="M9 14L4 9L9 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9H14.5C17.5376 9 20 11.4624 20 14.5C20 17.5376 17.5376 20 14.5 20H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ),
};

/**
 * Icons repeated on every list row, defined once per page and drawn with
 * <use>, so thirty rows don't carry thirty copies of each path.
 */
export const iconSprite = raw(
  '<svg hidden><symbol id="icon-edit" viewBox="0 0 24 24" fill="none"><path d="M4 20H8L18.5 9.5C19.6 8.4 19.6 6.6 18.5 5.5C17.4 4.4 15.6 4.4 14.5 5.5L4 16V20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 6.5L17.5 10.5" stroke="currentColor" stroke-width="2"/></symbol><symbol id="icon-grip" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.75"/><circle cx="15" cy="6" r="1.75"/><circle cx="9" cy="12" r="1.75"/><circle cx="15" cy="12" r="1.75"/><circle cx="9" cy="18" r="1.75"/><circle cx="15" cy="18" r="1.75"/></symbol></svg>',
);

export const spriteIcons = {
  edit: raw('<svg aria-hidden="true" class="item-edit-icon"><use href="#icon-edit"/></svg>'),
  grip: raw('<svg aria-hidden="true" width="20" height="20"><use href="#icon-grip"/></svg>'),
};

export function visuallyHidden(content: Html | string) {
  return html`<span class="visually-hidden">${content}</span>`;
}

/** Hides the text when the header is narrow; it stays the accessible name. */
export function actionLabel(text: string) {
  return html`<span class="page-header-label">${text}</span>`;
}

// --- Page chrome ---

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * The breadcrumbs (the last one is the page's h1), with the page's actions
 * beside them. Off home, a "Back to index" arrow leads.
 */
export function pageHeader({
  crumbs,
  actions = [],
  compactBelow = "15rem",
  isHome = false,
}: {
  crumbs: Crumb[];
  actions?: Html[];
  compactBelow?: "15rem" | "27rem";
  isHome?: boolean;
}) {
  const all: Array<{ label: Html | string; href?: string }> = isHome
    ? crumbs
    : [
        {
          label: html`${visuallyHidden("Back to index")}<span aria-hidden="true">&#10229;</span>`,
          href: "/",
        },
        ...crumbs,
      ];

  return html`<header class="page-header-header">
    <nav aria-label="Breadcrumbs" class="breadcrumbs-nav">
      <ol class="breadcrumbs-list">
        ${all.map((crumb, index) =>
          index === all.length - 1
            ? html`<li class="breadcrumbs-current-item breadcrumbs-item">
                <h1 class="breadcrumbs-current-page" aria-current="page">${crumb.label}</h1>
              </li>`
            : html`<li class="breadcrumbs-item">
                <a class="button button-primary breadcrumbs-link" href="${crumb.href ?? "/"}"
                  >${crumb.label}</a
                >
              </li>`,
        )}
      </ol>
    </nav>
    ${
      actions.length > 0
        ? html`<div
            class="page-header-actions page-header-${compactBelow}"
            style="--page-header-action-count: ${actions.length}"
          >
            ${actions}
          </div>`
        : ""
    }
  </header>`;
}

/**
 * The notification panel under the header. A flash from the last action is
 * rendered straight into it; scripts add their own (see client toast.ts).
 * Successes clear themselves with a CSS animation, paused while hovered or
 * focused, so no script is needed to dismiss them. Clear is wired up by
 * base.ts; without it, anything else stays until the next page.
 */
export function notifications(flash: Flash | null) {
  const autoDismiss = flash?.type === "success";
  return html`<section
    id="notifications"
    aria-label="Notifications"
    class="notifications-panel"
    ${flash ? raw("data-open") : ""}
    ${autoDismiss ? raw("data-auto-dismiss") : ""}
  >
    <div class="notifications-clip">
      <div
        role="status"
        class="${cx("notifications-status", flash && "notifications-notification", flash && `notifications-${flash.type}`)}"
      >
        ${
          flash
            ? html`<div class="notifications-body">
                <p class="notifications-message">
                  ${autoDismiss ? html`<span aria-hidden="true" class="notifications-clock"></span>` : ""}
                  <span>${flash.message}</span>
                </p>
                <div class="notifications-buttons">
                  <button type="button" class="button button-outline" data-clear-notification>
                    Clear
                  </button>
                </div>
              </div>`
            : ""
        }
      </div>
    </div>
  </section>`;
}

export function scrollArea(content: Html) {
  return html`<div class="scroll-area-outer">
    <div class="scroll-area-inner">
      <div aria-hidden="true" class="scroll-area-edge scroll-area-edge-start"></div>
      ${content}
      <div aria-hidden="true" class="scroll-area-edge scroll-area-edge-end"></div>
    </div>
  </div>`;
}

export function actionsBar(content: Html) {
  return html`<section class="actions-bar">${content}</section>`;
}

export function offlineIndicator() {
  return html`<div class="online-status-indicator" data-offline-indicator hidden>Offline</div>`;
}

/**
 * A dialog that is its own route (`/style`, `/config/:list`…), rendered
 * open over its parent page. Without JS it's a non-modal `dialog[open]`
 * styled like the modal, and closing is a link back; base.ts upgrades it to
 * a real modal with showModal() so Escape and the backdrop close it too.
 */
export function routeDialog({
  id = "route-dialog",
  closeUrl,
  labelledBy,
  label,
  content,
}: {
  /** Also lets a script replace it in place (data-swap). */
  id?: string;
  closeUrl: string;
  labelledBy?: string;
  label?: string;
  content: Html;
}) {
  return html`<dialog
    open
    id="${id}"
    data-swap
    class="modal-dialog"
    closedby="any"
    data-route-dialog
    data-close-url="${closeUrl}"
    ${labelledBy ? html`aria-labelledby="${labelledBy}"` : ""}
    ${label ? html`aria-label="${label}"` : ""}
  >
    <div class="modal-content">${content}</div>
  </dialog>`;
}

/**
 * Closes the route dialog it's in (an invoker command, no script); base.ts
 * then goes back to the page behind it.
 */
export function closeButton(label: string, dialogId = "route-dialog") {
  return html`<button
    type="button"
    commandfor="${dialogId}"
    command="close"
    class="button button-outline"
  >
    ${label}
  </button>`;
}

export function checkboxField({
  id,
  name,
  value,
  checked = false,
  label,
}: {
  id: string;
  name: string;
  value: string;
  checked?: boolean;
  label: Html | string;
}) {
  return html`<div class="checkbox-field-wrapper">
    <input
      type="checkbox"
      id="${id}"
      name="${name}"
      value="${value}"
      class="checkbox-field-checkbox"
      ${checked ? raw("checked") : ""}
    />
    <label for="${id}">${label}</label>
  </div>`;
}

const schemeIcons = { system: icons.contrast, light: icons.sun, dark: icons.moon };

/**
 * Cycles Auto → Light → Dark. A plain form post that sets the cookie and
 * comes back; base.ts applies it in place instead (and so offline too).
 */
export function colorSchemeToggle(scheme: ColorScheme, returnTo: string) {
  const names = Object.keys(colorSchemes) as ColorScheme[];
  const next = names[(names.indexOf(scheme) + 1) % names.length];
  return html`<form method="post" action="/color-scheme" data-color-scheme-form>
    <input type="hidden" name="scheme" value="${next}" />
    <input type="hidden" name="return-to" value="${returnTo}" />
    <button type="submit" class="button button-outline">
      ${schemeIcons[scheme]}${visuallyHidden("Colour scheme: ")}${colorSchemes[scheme].label}
    </button>
  </form>`;
}
