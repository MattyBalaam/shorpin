import type { Route } from "./+types/list";

import { useEffect, useRef, useState } from "react";
import {
  href,
  isRouteErrorResponse,
  useNavigation,
  useRevalidator,
  useRouteError,
  useSubmit,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import { Items } from "~/components/items";
import { breadcrumb } from "~/components/breadcrumbs/breadcrumbs";

import { parseSubmission, useForm, useFormData } from "@conform-to/react/future";
import * as v from "valibot";
import { zList } from "./data";
import { Link } from "~/components/link/link";
import { Form } from "~/components/form/form";
export { action, loader } from "./list.server";

import { toast } from "sonner";
import { report } from "@conform-to/react/future";
import {
  ADD_ITEM_INTENT,
  isAddItemIntent,
  isDeleteItemIntent,
  isUndeleteItemIntent,
  undeleteItemIntent,
} from "./intents";

// Cache loader data for offline support
let cachedLoaderData: Awaited<ReturnType<typeof import("./list.server").loader>> | null = null;

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  if (!navigator.onLine && cachedLoaderData) {
    return cachedLoaderData;
  }

  try {
    const data = await serverLoader();
    cachedLoaderData = data;
    return data;
  } catch (error) {
    console.error("Error in clientLoader", error);

    const isNetworkOrServerError =
      (error instanceof TypeError && error.message.includes("fetch")) ||
      (isRouteErrorResponse(error) && error.status >= 500);

    if (isNetworkOrServerError && cachedLoaderData) {
      return cachedLoaderData;
    }
    throw error;
  }
}

clientLoader.hydrate = true as const;

// Prevent revalidation when offline, but allow initial navigation to this route
export function shouldRevalidate({ currentUrl, nextUrl }: ShouldRevalidateFunctionArgs) {
  const isRevalidation = currentUrl.pathname === nextUrl.pathname;
  if (isRevalidation && typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }
  return true;
}

// Handle offline submissions - construct fake lastResult for Conform
export async function clientAction({ request, serverAction }: Route.ClientActionArgs) {
  if (!navigator.onLine) {
    const formData = await request.formData();
    const submission = parseSubmission(formData);

    const result = v.safeParse(zList, submission.payload);

    if (!result.success) {
      return {
        lastDeleted: undefined,
        lastResult: report(submission, { error: { issues: result.issues } }),
      };
    }

    // Get current items from form
    const currentItems = result.output.items;

    const toAdd = isAddItemIntent(result.output["new-submit"]);

    // Add new item if present
    if (result.output.new && toAdd) {
      currentItems.push({
        id: crypto.randomUUID(),
        value: result.output.new,
      });
    }

    toast.info("You're offline - changes saved locally");

    return {
      lastDeleted: undefined,
      lastResult: report(submission, {
        reset: toAdd && Boolean(result.output.new),
        value: {
          ...submission.payload,
          new: toAdd ? "" : (result.output.new ?? ""),
          items: currentItems,
        },
      }),
    };
  }
  return serverAction();
}

import { useIsOnline } from "~/components/online-status/online-status";
import { ScrollArea } from "~/components/scroll-area/scroll-area";
import * as styles from "./list.css";
import * as itemsStyles from "~/components/items.css";
import { Button } from "~/components/button/button";
import { Actions } from "~/components/actions/actions";
import { Theme } from "~/components/theme/theme";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";

export function HydrateFallback() {
  return (
    <ScrollArea>
      <ul className={itemsStyles.items}>
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className={itemsStyles.skeletonItem}>
            <div className={itemsStyles.skeletonContent}>
              <div className={itemsStyles.skeletonBar} />
              <div className={itemsStyles.skeletonBar} />
              <div className={itemsStyles.skeletonBar} />
            </div>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

export const handle = {
  breadcrumb: breadcrumb<Route.ComponentProps["loaderData"]>({
    label: (data) => data?.defaultValue?.name ?? "List",
  }),
};

export default function list({ actionData, loaderData }: Route.ComponentProps) {
  const defaultValue = loaderData.defaultValue;
  const lastResult = actionData?.lastResult;

  const { state, formData } = useNavigation();

  const { revalidate } = useRevalidator();
  const [clientId] = useState(() => {
    if (typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem("clientId");
      if (stored) return stored;
    }
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    const id = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("clientId", id);
    }
    return id;
  });

  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const isOnline = useIsOnline({
    onOffline: () => {
      toast.info("You're offline - changes saved locally");
    },
    onOnline: () => {
      formRef.current?.requestSubmit();
      toast.success("Back online - syncing changes");
    },
  });

  // Subscribe to broadcast for real-time updates
  useEffect(
    function subscribeToBroadcast() {
      if (!loaderData.listId) return;

      let cancelled = false;
      let cleanup: (() => void) | undefined;

      import("~/lib/supabase.client")
        .then(({ realtimeClient }) => {
          if (cancelled) return;

          const channel = realtimeClient
            .channel(`list-${loaderData.listId}`)
            .on("broadcast", { event: "changed" }, ({ payload }) => {
              if (payload.clientId !== clientId) {
                toast.info("List updated by another user");
                revalidate();
              }
            })
            .subscribe();

          cleanup = () => realtimeClient.removeChannel(channel);
        })
        .catch((error) => {
          console.error("Failed to load Supabase realtime client:", error);
        });

      return () => {
        cancelled = true;
        cleanup?.();
      };
    },
    [loaderData.listId, clientId, revalidate],
  );

  const { form, fields, intent } = useForm(zList, {
    defaultValue,
    lastResult,
    shouldValidate: "onBlur",
    onValidate: (ctx) => {
      if (
        // we want to skip validation when deleting or undeleting items
        // so that the intent is sent server side
        isUndeleteItemIntent(ctx.intent?.type) ||
        isDeleteItemIntent(ctx.intent?.type)
      ) {
        return null;
      }

      return ctx;
    },
  });

  const itemsKey = defaultValue.items.map((i) => `${i.id}:${i.value}`).join(",");

  // Track previous actionData to detect when updates came from our own action
  const prevActionDataRef = useRef(actionData);

  useEffect(
    function updateFormWithNewValues() {
      // Don't overwrite local changes when offline
      if (!isOnline) {
        return;
      }

      const actionDataJustChanged = prevActionDataRef.current !== actionData;
      prevActionDataRef.current = actionData;

      // Skip if this update came from our own action - Conform already handled it via lastResult
      if (actionDataJustChanged && actionData?.lastResult) {
        return;
      }

      // Ensure form element exists before updating
      const formElement = document.getElementById(form.id);
      if (!formElement) {
        return;
      }

      intent.update({ name: fields.items.name, value: defaultValue.items });
    },
    [itemsKey, intent, actionData, fields.items.name, defaultValue.items, form.id, isOnline],
  );

  const lastDeleted = actionData?.lastDeleted || loaderData.lastDeleted;

  const edited =
    useFormData(form.id, (formData) => {
      const submission = parseSubmission(formData);

      const result = v.safeParse(zList, submission.payload);

      if (!result.success) {
        return [];
      }

      // Guard: AnimatePresence keeps a deleted item's <input> elements in the
      // DOM during its exit animation. Conform re-numbers the remaining items
      // into those same positions, causing two inputs to share the same name
      // (e.g. items[1][id]). parseSubmission stores an array for that field,
      // UUID validation fails, v.fallback fires → items becomes [].
      // When that happens every defaultValue item looks "edited". Return []
      // instead so we don't show false indicators during the brief animation.
      if (result.output.items.length === 0 && defaultValue.items.length > 0) {
        return [];
      }

      return defaultValue.items
        .filter(
          ({ value, id }) => result.output.items?.find((item) => item?.id === id)?.value !== value,
        )
        .map(({ id }) => id);
    }) || [];

  return (
    <Theme
      defaultPrimary={defaultValue.themePrimary}
      defaultSecondary={defaultValue.themeSecondary}
    >
      <div className={styles.topActions}>
        <Theme.Button formId={form.id} />
      </div>

      <Form
        {...form.props}
        ref={formRef}
        // validationErrors={form.fieldErrors}
        method="POST"
        className={styles.form}
      >
        {/* hidden submit button captures Enter key presses to add a new item */}
        <VisuallyHidden>
          <button type="submit" name="new-submit" value={ADD_ITEM_INTENT}>
            Update
          </button>
        </VisuallyHidden>

        <input
          name={fields.name.name}
          id={fields.name.id}
          defaultValue={fields.name.defaultValue}
          type="hidden"
        />
        <input name="clientId" value={clientId} type="hidden" />
        <Theme.Fields
          fieldNames={{
            primary: fields.themePrimary.name,
            secondary: fields.themeSecondary.name,
          }}
        />

        <ScrollArea>
          <Items
            fieldMetadata={fields.items}
            edited={edited}
            pendingItem={
              state === "submitting" && formData?.get("new-submit") === ADD_ITEM_INTENT
                ? (formData.get(fields.new.name) as string)
                : null
            }
            onReorder={(newOrder) => {
              const itemRecord = Object.fromEntries(
                defaultValue.items.map((item) => [item.id, item]),
              );

              intent.update({
                name: fields.items.name,
                value: newOrder.map((id) => itemRecord[id]),
              });
            }}
            onReorderComplete={() => {
              // Wait for React to flush the intent.update() before submitting
              requestAnimationFrame(() => {
                submit(formRef.current);
              });
            }}
          />
        </ScrollArea>

        <Actions>
          <div className={styles.actions}>
            <VisuallyHidden>
              <label htmlFor={fields.new.id}>New item</label>
            </VisuallyHidden>
            <input name={fields.new.name} id={fields.new.id} autoFocus autoComplete="off" />
            <Button
              type="submit"
              value={ADD_ITEM_INTENT}
              name="new-submit"
              isSubmitting={state === "submitting"}
            >
              Add
            </Button>

            {lastDeleted ? (
              <button
                type="submit"
                name="__INTENT__"
                value={undeleteItemIntent(lastDeleted.id)}
                className={styles.undoButton}
              >
                Undo
              </button>
            ) : null}
          </div>
        </Actions>
      </Form>
    </Theme>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { revalidate, state } = useRevalidator();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className={styles.errorState}>
        <p>{error.data?.message ?? "List not found."}</p>
        <Link to={href("/")}>Back to home</Link>
      </div>
    );
  }

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
