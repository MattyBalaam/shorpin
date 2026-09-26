import { toDarkModeCss } from "~/lib/palette";
import * as styles from "./palette-preview.css";

interface PaneProps {
  label: string;
  ink: "black" | "white";
  paneBackground: string;
  primary: string;
  secondary: string;
}

function Pane({ label, ink, paneBackground, primary, secondary }: PaneProps) {
  return (
    <div className={styles.pane} style={{ background: paneBackground }}>
      <p className={styles.paneLabel} style={{ color: ink }}>
        {label}
      </p>
      <div className={styles.row} style={{ background: secondary }}>
        <span className={styles.line} style={{ background: ink }} />
        <span className={styles.badge} style={{ background: primary, color: ink }}>
          New
        </span>
      </div>
      <div className={styles.row} style={{ background: secondary }}>
        <span className={styles.line} style={{ background: ink, width: "70%" }} />
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={styles.button}
        style={{ background: primary, color: ink }}
      >
        Add
      </button>
    </div>
  );
}

interface PalettePreviewProps {
  primary: string;
  secondary: string;
}

// Wireframe mockup, not the real components: two static panes shown side by
// side so both are visible regardless of the viewer's own OS colour scheme.
// The dark pane mirrors exactly what Theme injects for prefers-color-scheme:
// dark (see toDarkModeCss), so what's previewed here is what ships.
export function PalettePreview({ primary, secondary }: PalettePreviewProps) {
  return (
    <div className={styles.grid}>
      <Pane
        label="Light"
        ink="black"
        paneBackground="#f5f5f5"
        primary={primary}
        secondary={secondary}
      />
      <Pane
        label="Dark"
        ink="white"
        paneBackground="#1a1a1a"
        primary={toDarkModeCss(primary)}
        secondary={toDarkModeCss(secondary)}
      />
    </div>
  );
}
