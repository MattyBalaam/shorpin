"use client";

import type { ComponentProps } from "react";
import { Form as RouterForm } from "react-router";

type RouterFormProps = ComponentProps<typeof RouterForm>;

export function Form({
  children,
  method,
  ...props
}: Omit<RouterFormProps, "method" | "action"> & {
  method?: "GET" | "POST";
}) {
  return (
    <RouterForm method={method} {...props}>
      {children}
    </RouterForm>
  );
}
