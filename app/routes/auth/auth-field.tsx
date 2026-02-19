import type { FieldMetadata } from "@conform-to/react/future";
import * as styles from "./auth-field.css";

type AuthFieldProps = {
  meta: FieldMetadata<string>;
  label: string;
} & (
  | { type: "email"; autoComplete: "email" }
  | { type: "password"; autoComplete: "current-password" | "new-password" }
);

export function AuthField({ meta, label, type, autoComplete }: AuthFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={meta.id}>{label}</label>
      <input
        type={type}
        name={meta.name}
        id={meta.id}
        autoComplete={autoComplete}
        required={meta.required}
        minLength={meta.minLength}
        aria-invalid={meta.ariaInvalid}
        aria-describedby={meta.ariaDescribedBy}
      />
      {meta.errors && (
        <div id={meta.errorId}>
          {meta.errors.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </div>
      )}
    </div>
  );
}
