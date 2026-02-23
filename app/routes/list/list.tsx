import type { Route } from "./+types/list";

import { useEffect, useRef, useState } from "react";
import { useNavigation, useRevalidator, type ShouldRevalidateFunctionArgs } from "react-router";

import { Items } from "~/components/items";

import { parseSubmission, useForm, useFormData } from "@conform-to/react/future";
import * as v from "valibot";
import { zList } from "./data";
import { Link } from "~/components/link/link";
import { Form } from "~/react-aria/Form";
export { action, loader } from "./list.server";

import { toast } from "sonner";
import { report } from "@conform-to/react/future";
import { isDeleteItemIntent, isUndeleteItemIntent, undeleteItemIntent } from "./intents";

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

    if (error instanceof TypeError && error.message.includes("fetch")) {
      if (cachedLoaderData) {
        return cachedLoaderData;
      }
    }
    throw error;
  }
}

clientLoader.hydrate = true as const;

// Prevent revalidation when offline, but allow initial navigation to this route
export function shouldRevalidate({ currentUrl, nextUrl }: ShouldRevalidateFunctionArgs) {
  console.log("shouldRevalidate", {
    currentUrl,
    nextUrl,
    isOnline: navigator.onLine,
  });

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
      throw new Error("fix me");
    }

    // Get current items from form
    const currentItems = result.output.items;

    // Add new item if present
    if (result.output.new) {
      currentItems.push({
        id: crypto.randomUUID(),
        value: result.output.new,
      });
    }

    toast.info("You're offline - changes saved locally");

    return {
      lastDeleted: undefined,
      lastResult: report(submission, {
        reset: Boolean(result.output.new),
        value: {
          ...submission.payload,
          new: "",
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
  breadcrumb: {
    label: (data: any) => data?.defaultValue?.name || "List",
  },
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

  const reorderSubmitRef = useRef<HTMLButtonElement>(null);
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

      import("~/lib/supabase.client").then(({ realtimeClient }) => {
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
        validationErrors={form.fieldErrors}
        method="POST"
        className={styles.form}
      >
        {/* hidden submit button which will be used if a user presses enter or reorders */}
        <button
          ref={reorderSubmitRef}
          type="submit"
          value="new"
          name="new-submit"
          className={styles.hiddenSubmit}
        >
          Update
        </button>

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
              state === "submitting" && formData?.get("new-submit") === "new"
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
                reorderSubmitRef.current?.click();
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
              value="new"
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
