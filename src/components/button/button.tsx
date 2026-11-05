import type { JSX } from "@solidjs/web";
import { omit, Show } from "solid-js";
import { Spinner } from "~/components/spinner/spinner";
import * as clickableStyles from "~/components/shared/clickable-element.css";

// No `disabled`: a disabled button can't say why it won't work. Keep it
// clickable and explain instead (e.g. a toast) — see CONTRIBUTING.md.
interface ButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  isSubmitting?: boolean;
  variant?: Exclude<keyof typeof clickableStyles.variant, "link">;
}

// Props are read where they're used, never destructured: Solid props are
// getters, and reading one early would freeze its first value.
export function Button(props: ButtonProps) {
  const rest = omit(props, "type", "class", "children", "isSubmitting", "variant");

  return (
    <button
      class={[clickableStyles.variant[props.variant ?? "primary"], props.class]}
      type={props.type ?? "button"}
      {...rest}
    >
      <Show when={props.isSubmitting} fallback={props.children}>
        <Spinner />
      </Show>
    </button>
  );
}
