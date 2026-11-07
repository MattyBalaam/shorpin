import { createSignal, type Element, onSettled, Show } from "solid-js";
import { toAdaptiveCss } from "~/lib/palette";
import { vars } from "~/styles/theme.css";
import * as modalStyles from "../modal/modal.css";
import { Button } from "../button/button";
import { PaletteIcon } from "../icon/icons";
import { ActionLabel } from "../page-header/page-header";
import { PalettePreview } from "./palette-preview";

export type ThemeColors = { primary: string; secondary: string };

// Extract CSS variable name from vanilla-extract var reference
// e.g., "var(--abc123)" -> "--abc123"
function extractVarName(varRef: string) {
  const match = varRef.match(/var\((--[^)]+)\)/);
  return match ? match[1] : varRef;
}

const primaryVarName = extractVarName(vars.palette.primary);
const secondaryVarName = extractVarName(vars.palette.secondary);

/**
 * Applies a list's own palette to the page. A plain <style> that mounts and
 * unmounts with the page, so a list's colours never outlive it (React's
 * href/precedence hoisting once leaked them onto home; see theme.spec.ts).
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

function PaletteDialog(props: {
  candidate: ThemeColors;
  onShuffle: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  let dialog!: HTMLDialogElement;

  // Mounted only while there's a candidate; showModal() needs it connected.
  onSettled(() => {
    dialog.showModal();
  });

  return (
    <dialog
      ref={dialog}
      class={modalStyles.dialog}
      aria-label="Colours"
      // Cancel, Escape and the backdrop all end here.
      onClose={() => props.onClose()}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.close();
      }}
    >
      <div class={modalStyles.content}>
        <div class={modalStyles.body}>
          <PalettePreview primary={props.candidate.primary} secondary={props.candidate.secondary} />
        </div>
        <div class={modalStyles.actions}>
          <Button variant="outline" onClick={() => dialog.close()}>
            Cancel
          </Button>
          <Button onClick={() => props.onShuffle()}>Shuffle</Button>
          <Button
            onClick={() => {
              props.onConfirm();
              dialog.close();
            }}
          >
            Use these colours
          </Button>
        </div>
      </div>
    </dialog>
  );
}

/**
 * The 🎨 palette picker: generates a random palette and previews it in a
 * dialog until it's confirmed. The candidate is kept here, apart from the
 * page's colours, so cancelling never touches the live theme. The page owns
 * the colours (and saves them), so `onConfirm` hands them over.
 */
function ThemeButton(props: { onConfirm: (colors: ThemeColors) => void }) {
  const [candidate, setCandidate] = createSignal<ThemeColors | null>(null);

  // The generator is most of the palette code and only runs from here, so
  // it's loaded on the first press rather than with the list page.
  async function shuffle() {
    const { generateThemeColors } = await import("~/lib/palette-generator");
    const { primary, secondary } = generateThemeColors();
    setCandidate({ primary, secondary });
  }

  return (
    <>
      <Button onClick={shuffle}>
        <PaletteIcon />
        <ActionLabel>Colours</ActionLabel>
      </Button>
      <Show when={candidate()}>
        {(colors) => (
          <PaletteDialog
            candidate={colors()}
            onShuffle={shuffle}
            onConfirm={() => props.onConfirm(colors())}
            onClose={() => setCandidate(null)}
          />
        )}
      </Show>
    </>
  );
}

Theme.Button = ThemeButton;
