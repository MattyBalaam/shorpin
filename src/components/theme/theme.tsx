import { type Element, Show } from "solid-js";
import { toAdaptiveCss } from "~/lib/palette";
import { vars } from "~/styles/theme.css";

// Extract CSS variable name from vanilla-extract var reference
// e.g., "var(--abc123)" -> "--abc123"
function extractVarName(varRef: string) {
  const match = varRef.match(/var\((--[^)]+)\)/);
  return match ? match[1] : varRef;
}

const primaryVarName = extractVarName(vars.palette.primary);
const secondaryVarName = extractVarName(vars.palette.secondary);

/**
 * Applies a list's own palette to the page. Not yet ported (see
 * legacy/README.md): the 🎨 palette picker and its preview dialog
 * (Theme.Button), which also saved the choice through the list form.
 */
export function Theme(props: { primary?: string; secondary?: string; children?: Element }) {
  return (
    <>
      <Show when={props.primary && props.secondary}>
        <style>
          {`:root:root {
            ${primaryVarName}: ${toAdaptiveCss(props.primary ?? "")};
            ${secondaryVarName}: ${toAdaptiveCss(props.secondary ?? "")};
          }`}
        </style>
      </Show>
      {props.children}
    </>
  );
}
