import { toDarkModeCss } from "~/lib/palette";
import * as styles from "./palette-preview.css";

interface PaneProps {
  label: string;
  ink: "black" | "white";
  paneBackground: string;
  primary: string;
  secondary: string;
}

function Pane(props: PaneProps) {
  return (
    <div class={styles.pane} style={{ background: props.paneBackground }}>
      <p class={styles.paneLabel} style={{ color: props.ink }}>
        {props.label}
      </p>
      <div class={styles.row} style={{ background: props.secondary }}>
        <span class={styles.line} style={{ background: props.ink }} />
        <span class={styles.badge} style={{ background: props.primary, color: props.ink }}>
          New
        </span>
      </div>
      <div class={styles.row} style={{ background: props.secondary }}>
        <span class={styles.line} style={{ background: props.ink, width: "70%" }} />
      </div>
      <button
        type="button"
        tabindex={-1}
        aria-hidden="true"
        class={styles.button}
        style={{ background: props.primary, color: props.ink }}
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
export function PalettePreview(props: PalettePreviewProps) {
  return (
    <div class={styles.grid}>
      <Pane
        label="Light"
        ink="black"
        paneBackground="#f5f5f5"
        primary={props.primary}
        secondary={props.secondary}
      />
      <Pane
        label="Dark"
        ink="white"
        paneBackground="#1a1a1a"
        primary={toDarkModeCss(props.primary)}
        secondary={toDarkModeCss(props.secondary)}
      />
    </div>
  );
}
