import { Form, useNavigation } from "react-router";
import type { Route } from "./+types/request-access";
import { Button } from "~/components/button/button";
import { useForm } from "@conform-to/react/future";
import { zRequestAccess } from "./schemas";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";

export { action } from "./request-access.server";

export const handle = {
  breadcrumb: { label: "Request access" },
};

export default function RequestAccess({ actionData }: Route.ComponentProps) {
  const { state } = useNavigation();
  const { form, fields } = useForm(zRequestAccess, {
    lastResult: actionData,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <>
      <h1>Request access</h1>
      <Form method="POST" {...form.props} className={styles.form}>
        {form.errors?.map((error, i) => (
          <p key={i}>{error}</p>
        ))}
        <AuthField
          meta={fields.first_name}
          label="First name"
          type="text"
          autoComplete="given-name"
        />
        <AuthField
          meta={fields.last_name}
          label="Last name"
          type="text"
          autoComplete="family-name"
        />
        <AuthField
          meta={fields.email}
          label="Email"
          type="email"
          autoComplete="email"
        />
        <Button type="submit" isSubmitting={state === "submitting"}>
          Request access
        </Button>
      </Form>
    </>
  );
}
