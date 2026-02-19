import * as styles from "./auth-field.css";

interface AuthFieldProps {
  label: string;
  id: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  errors?: string[];
}

export function AuthField({
  label,
  id,
  name,
  type = "text",
  autoComplete,
  required,
  minLength,
  errors,
}: AuthFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        type={type}
        name={name}
        id={id}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
      />
      {errors?.map((error, i) => (
        <p key={i}>{error}</p>
      ))}
    </div>
  );
}
