import { type AppStyle, appStyles, INHERIT_APP_STYLE } from "../../lib/app-style.ts";
import { html, raw } from "../html.ts";
import { closeButton, routeDialog } from "./components.ts";

const styleNames = Object.keys(appStyles) as AppStyle[];

/**
 * The body of a style route (`/style`, `/lists/:list/style`). Nothing
 * changes until Save; each option previews itself in miniature by carrying
 * its own data-app-style.
 */
export function styleDialog({
  title,
  value,
  closeUrl,
  inherit,
}: {
  title: string;
  /** The saved style; null when following the viewer's own. */
  value: AppStyle | null;
  closeUrl: string;
  /** Offers "My style" (no override), previewed in this style. */
  inherit?: AppStyle;
}) {
  const options = [
    ...(inherit
      ? [
          {
            value: INHERIT_APP_STYLE,
            style: inherit,
            label: "My style",
            description: `Follow your own style (${appStyles[inherit].label})`,
          },
        ]
      : []),
    ...styleNames.map((name) => ({ value: name, style: name, ...appStyles[name] })),
  ];
  const selected = value ?? INHERIT_APP_STYLE;

  return routeDialog({
    closeUrl,
    labelledBy: "style-heading",
    content: html`<h2 id="style-heading">${title}</h2>
      <div class="modal-body">
        <form id="style-form" method="post">
          <div role="radiogroup" aria-labelledby="style-heading" class="style-picker-options">
            ${options.map(
              (option) =>
                html`<label class="style-picker-option" data-app-style="${option.style}">
                  <input
                    type="radio"
                    name="style"
                    value="${option.value}"
                    class="style-picker-radio"
                    ${option.value === selected ? raw("checked") : ""}
                  />
                  <span class="style-picker-label">${option.label}</span>
                  <span class="style-picker-description">${option.description}</span>
                  <span class="style-picker-preview" aria-hidden="true">
                    <span class="style-picker-badge">New</span>
                    <span class="button button-solid style-picker-preview-button">Add</span>
                  </span>
                </label>`,
            )}
          </div>
        </form>
      </div>
      <div class="modal-actions">
        ${closeButton("Cancel")}
        <button type="submit" form="style-form" class="button button-primary">Save</button>
      </div>`,
  });
}
