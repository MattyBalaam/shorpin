import { createContext, useContext, useState } from "react";
import { vars } from "~/styles/theme.css";
import { Button } from "../button/button";

interface ThemeContextValue {
  colors: { primary: string; secondary: string } | null;
  generateColors: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("Theme compound components must be used within Theme");
  }
  return context;
}

function generateComplementaryColors(): { primary: string; secondary: string } {
  // Random hue between 0-360
  const hue = Math.floor(Math.random() * 360);
  // Complementary hue is 180 degrees away
  const complementaryHue = (hue + 180) % 360;

  // Pastel colors: moderate saturation, high lightness
  const saturation = 40 + Math.random() * 20; // 40-60%
  const lightness = 75 + Math.random() * 10; // 75-85%

  const primary = `hsl(${hue}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`;
  const secondary = `hsl(${complementaryHue}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`;

  return { primary, secondary };
}

// Extract CSS variable name from vanilla-extract var reference
// e.g., "var(--abc123)" -> "--abc123"
function extractVarName(varRef: string): string {
  const match = varRef.match(/var\((--[^)]+)\)/);
  return match ? match[1] : varRef;
}

interface ThemeProps {
  defaultPrimary?: string;
  defaultSecondary?: string;
  children: React.ReactNode;
}

export function Theme({
  defaultPrimary,
  defaultSecondary,
  children,
}: ThemeProps) {
  const [colors, setColors] = useState<{
    primary: string;
    secondary: string;
  } | null>(() => {
    if (defaultPrimary && defaultSecondary) {
      return { primary: defaultPrimary, secondary: defaultSecondary };
    }
    return null;
  });

  const primaryVarName = extractVarName(vars.palette.primary);
  const secondaryVarName = extractVarName(vars.palette.secondary);

  return (
    <ThemeContext.Provider
      value={{
        colors,
        generateColors: () => setColors(generateComplementaryColors()),
      }}
    >
      {colors && (
        <style>
          {`:root {
            ${primaryVarName}: ${colors.primary};
            ${secondaryVarName}: ${colors.secondary};
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
      <input
        type="hidden"
        name={fieldNames.primary}
        value={colors?.primary ?? ""}
      />
      <input
        type="hidden"
        name={fieldNames.secondary}
        value={colors?.secondary ?? ""}
      />
    </>
  );
}

interface ThemeButtonProps {
  formId: string;
}

function ThemeButton({ formId }: ThemeButtonProps) {
  const { generateColors } = useThemeContext();

  function handleClick() {
    generateColors();
    // Submit the form after state updates
    requestAnimationFrame(() => {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      form?.requestSubmit();
    });
  }

  return <Button onClick={handleClick}>🎨</Button>;
}

Theme.Fields = Fields;
Theme.Button = ThemeButton;
