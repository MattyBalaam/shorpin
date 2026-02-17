"use client";

import type { ComponentProps } from "react";
import { Form as RouterForm } from "react-router";

type RouterFormProps = ComponentProps<typeof RouterForm>;

export function Form({
  validationErrors,
  children,
  method,
  ...props
}: Omit<RouterFormProps, "method" | "action"> & {
  method?: "GET" | "POST";
  validationErrors?: Record<string, string | string[]>;
}) {
  return (
    <RouterForm method={method} {...props}>
      {children}
    </RouterForm>
  );
}
