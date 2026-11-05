import type { FieldElementProps } from "@formisch/solid/v2";
import { createUniqueId, For, Show } from "solid-js";
import * as styles from "./auth-field.css";

type AuthFieldProps = {
  // The parts of a Formisch FieldStore this uses: a structural type, since
  // FieldStore<Schema, Path> for a specific field isn't assignable to the
  // generic one.
  field: { props: FieldElementProps; input: unknown; errors: readonly string[] | null };
  label: string;
} & (
  | { type: "email"; autocomplete: "email" }
  | { type: "password"; autocomplete: "current-password" | "new-password" }
  | { type: "text"; autocomplete: "given-name" | "family-name" | "off" }
);

export function AuthField(props: AuthFieldProps) {
  const id = createUniqueId();
  const errorId = `${id}-error`;

  return (
    <div class={styles.field}>
      <label for={id}>{props.label}</label>
      <input
        {...props.field.props}
        class={styles.input}
        id={id}
        type={props.type}
        autocomplete={props.autocomplete}
        value={(props.field.input as string | undefined) ?? ""}
        aria-invalid={props.field.errors ? "true" : undefined}
        aria-describedby={props.field.errors ? errorId : undefined}
      />
      <Show when={props.field.errors}>
        {(errors) => (
          <div id={errorId}>
            <For each={errors()}>{(error) => <p>{error}</p>}</For>
          </div>
        )}
      </Show>
    </div>
  );
}
