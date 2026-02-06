import type { HTMLAttributes, Key } from "react";

interface ConformInputAttributes extends HTMLAttributes<HTMLElement> {
  name?: string;
  id?: string;
  label?: string;
  errors?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  defaultValue?: string;
  onConformInput?: (e: CustomEvent<{ value: string; name: string }>) => void;
  onConformChange?: (e: CustomEvent<{ value: string; name: string }>) => void;
  onConformBlur?: (e: CustomEvent<{ name: string }>) => void;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace React.JSX {
    interface IntrinsicElements {
      "conform-input": ConformInputAttributes;
    }
  }
}

export {};
