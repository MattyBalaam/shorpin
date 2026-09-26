import { createContext, useContext, useEffect, useRef, useState } from "react";
import { generateThemeColors, toAdaptiveCss } from "~/lib/palette";
import { vars } from "~/styles/theme.css";
import * as modalStyles from "../modal/modal.css";
import { Button } from "../button/button";
import { PalettePreview } from "./palette-preview";

type Colors = { primary: string; secondary: string };

interface ThemeContextValue {
  colors: Colors | null;
  candidate: Colors | null;
  generateCandidate: () => void;
  confirmCandidate: () => void;
  dismissCandidate: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("Theme compound components must be used within Theme");
  }
  return context;
}

// Extract CSS variable name from vanilla-extract var reference
// e.g., "var(--abc123)" -> "--abc123"
function extractVarName(varRef: string) {
  const match = varRef.match(/var\((--[^)]+)\)/);
  return match ? match[1] : varRef;
}

interface ThemeProps {
  defaultPrimary?: string;
  defaultSecondary?: string;
  children: React.ReactNode;
}

export function Theme({ defaultPrimary, defaultSecondary, children }: ThemeProps) {
  const [colors, setColors] = useState<Colors | null>(() => {
    if (defaultPrimary && defaultSecondary) {
      return { primary: defaultPrimary, secondary: defaultSecondary };
    }
    return null;
  });
  // Colours shown in the preview dialog but not yet applied — kept separate
  // from `colors` so cancelling the dialog never touches the live theme.
  const [candidate, setCandidate] = useState<Colors | null>(null);

  // Sync colors when props change (e.g., after revalidation from another client)
  useEffect(
    function syncColorsFromProps() {
      if (defaultPrimary && defaultSecondary) {
        setColors({ primary: defaultPrimary, secondary: defaultSecondary });
      }
    },
    [defaultPrimary, defaultSecondary],
  );

  const primaryVarName = extractVarName(vars.palette.primary);
  const secondaryVarName = extractVarName(vars.palette.secondary);

  return (
    <ThemeContext.Provider
      value={{
        colors,
        candidate,
        generateCandidate: () => {
          const { primary, secondary } = generateThemeColors();
          setCandidate({ primary, secondary });
        },
        confirmCandidate: () => {
          setColors(candidate);
          setCandidate(null);
        },
        dismissCandidate: () => setCandidate(null),
      }}
    >
      {colors && (
        <style href={`theme-${JSON.stringify(colors)}`} precedence="high">
          {`:root:root {
            ${primaryVarName}: ${toAdaptiveCss(colors.primary)};
            ${secondaryVarName}: ${toAdaptiveCss(colors.secondary)};
          }`}
        </style>
      )}
      {children}
    </ThemeContext.Provider>
  );
}

interface FieldsProps {
  fieldNames: {
    primary: string;
    secondary: string;
  };
}

function Fields({ fieldNames }: FieldsProps) {
  const { colors } = useThemeContext();

  return (
    <>
      <input type="hidden" name={fieldNames.primary} value={colors?.primary ?? ""} />
      <input type="hidden" name={fieldNames.secondary} value={colors?.secondary ?? ""} />
    </>
  );
}

interface ThemeButtonProps {
  formId: string;
}

function ThemeButton({ formId }: ThemeButtonProps) {
  const { candidate, generateCandidate, confirmCandidate, dismissCandidate } = useThemeContext();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // The dialog mounts only while there's a candidate to show; open it
  // natively once it's in the DOM, and guard against calling showModal()
  // again on re-shuffle while it's already open.
  useEffect(
    function showDialogForCandidate() {
      const dialog = dialogRef.current;
      if (candidate && dialog && !dialog.open) dialog.showModal();
    },
    [candidate],
  );

  function handleConfirm() {
    confirmCandidate();
    // Submit the form after state updates
    requestAnimationFrame(() => {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      form?.requestSubmit();
    });
  }

  return (
    <>
      <Button onClick={generateCandidate}>🎨</Button>
      {candidate && (
        <dialog
          ref={dialogRef}
          className={modalStyles.dialog}
          onClose={dismissCandidate}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              (e.currentTarget as HTMLDialogElement).close();
            }
          }}
        >
          <div className={modalStyles.content}>
            <PalettePreview primary={candidate.primary} secondary={candidate.secondary} />
            <div className={modalStyles.actions}>
              <Button variant="outline" type="button" onClick={dismissCandidate}>
                Cancel
              </Button>
              <Button type="button" onClick={generateCandidate}>
                Shuffle
              </Button>
              <Button type="button" onClick={handleConfirm}>
                Use these colours
              </Button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}

Theme.Fields = Fields;
Theme.Button = ThemeButton;
