"use client";

import { Form as RouterForm } from "react-router";

export function Form({
  validationErrors,
  children,
  method,
  ...props
}: Omit<FormProps, "method" | "action"> & { method?: "GET" | "POST" }) {
  return (
    <RouterForm method={method} {...props}>
      {/* <FormContext.Provider value={{ ...props, validationBehavior: "native" }}>
        <FormValidationContext.Provider value={validationErrors ?? {}}> */}
      {children}
      {/* </FormValidationContext.Provider>
      </FormContext.Provider>*/}
    </RouterForm>
  );
}
