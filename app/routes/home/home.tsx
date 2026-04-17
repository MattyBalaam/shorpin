import { useForm } from "@conform-to/react/future";
import { Suspense } from "react";
import {
  isRouteErrorResponse,
  type MetaFunction,
  Outlet,
  Form as RouterForm,
  useNavigation,
  useRevalidator,
  useRouteError,
} from "react-router";

import { Actions } from "~/components/actions/actions";
import { Button } from "~/components/button/button";
import { ScrollArea } from "~/components/scroll-area/scroll-area";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";

import type { Route } from "./+types/home";
import * as styles from "./home.css";
import { zCreate } from "./home.schema";

export { action, loader } from "./home.server";
import { clientLoader, Revalidator } from "./client-cache";
import { Spinner } from "~/components/spinner/spinner";
import { Lists, PendingSignUps } from "./components";

export { clientLoader };

export const meta: MetaFunction = () => {
  return [
    { title: "Home | Shorpin" },
    { name: "description", content: "We got lists, they’re multiplying" },
  ];
};

export const handle = {
  breadcrumb: {
    label: "Home",
  },
};

export function HydrateFallback() {
  return <p>Loading...</p>;
}

clientLoader.hydrate = true;

export default function Index({ loaderData, actionData }: Route.ComponentProps) {
  const { form, fields } = useForm(zCreate, {
    lastResult: actionData,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  const { state } = useNavigation();

  return (
    <>
      <div className={styles.pendingSignUps}>
        <Suspense fallback={null}>
          <Revalidator data={loaderData.revalidatePromise} />
          <PendingSignUps countPromise={loaderData.waitlistCount} />
        </Suspense>
      </div>
      <ScrollArea>
        <nav className={styles.listWrapper}>
          <Suspense fallback={<Spinner />}>
            <Lists listsPromise={loaderData.lists} userId={loaderData.userId} />
          </Suspense>{" "}
        </nav>
      </ScrollArea>

      <Actions>
        <RouterForm {...form.props} method="POST" className={styles.actions}>
          {form.errors?.map((error, i) => (
            <p key={i} className={styles.formError}>
              {error}
            </p>
          ))}
          <div className={styles.newList}>
            <VisuallyHidden>
              <label htmlFor={fields["new-list"].id}>New list</label>
            </VisuallyHidden>
            <input name={fields["new-list"].name} id={fields["new-list"].id} autoComplete="off" />

            <Button type="submit" isSubmitting={state === "submitting"}>
              Add
            </Button>
          </div>
        </RouterForm>
      </Actions>
      <Outlet />
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { revalidate, state } = useRevalidator();

  const message =
    isRouteErrorResponse(error) && error.status === 503
      ? "Couldn't reach the server."
      : "Something went wrong.";

  return (
    <div className={styles.errorState}>
      <p>{message}</p>
      <Button onClick={revalidate} isSubmitting={state === "loading"}>
        Retry
      </Button>
    </div>
  );
}
