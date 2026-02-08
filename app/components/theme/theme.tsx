import { useState } from "react";
import { vars } from "~/styles/theme.css";

interface ThemeProps {
  defaultPrimary?: string;
  defaultSecondary?: string;
  fieldNames: {
    primary: string;
    secondary: string;
  };
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

export function Theme({
  defaultPrimary,
  defaultSecondary,
  fieldNames,
}: ThemeProps) {
  const [colors, setColors] = useState(() => {
    if (defaultPrimary && defaultSecondary) {
      return { primary: defaultPrimary, secondary: defaultSecondary };
    }
    return generateComplementaryColors();
  });

  function handleGenerateColors() {
    setColors(generateComplementaryColors());
  }

  const primaryVarName = extractVarName(vars.palette.primary);
  const secondaryVarName = extractVarName(vars.palette.secondary);

  return (
    <>
      <style>
        {`:root {
          ${primaryVarName}: ${colors.primary};
          ${secondaryVarName}: ${colors.secondary};
        }`}
      </style>
      <input type="hidden" name={fieldNames.primary} value={colors.primary} />
      <input
        type="hidden"
        name={fieldNames.secondary}
        value={colors.secondary}
      />
      <button type="button" onClick={handleGenerateColors}>
        🎨
      </button>
    </>
  );
}
