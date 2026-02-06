import type { Route } from "./+types/list";

import { useEffect, useRef, useState } from "react";
import { useRevalidator } from "react-router";

import { Items } from "~/components/items";

import {
  parseSubmission,
  useForm,
  useFormData,
} from "@conform-to/react/future";
import { zList } from "./data";
import { Link } from "~/components/link/link";
import { Form } from "~/react-aria/Form";
export { action, loader } from "./list.server";

import { toast } from "sonner";
import { supabase } from "~/lib/supabase.client";
import * as styles from "./list.css";
import { Button } from "~/components/button/button";

export const handle = {
  breadcrumb: {
    label: (data: any) => data?.defaultValue?.name || "List",
  },
};

export default function list({ actionData, loaderData }: Route.ComponentProps) {
  const defaultValue = loaderData.defaultValue;
  const lastResult = actionData?.lastResult;
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to broadcast for real-time updates
  useEffect(
    function subscribeToBroadcast() {
      if (!loaderData.listId) return;

      const channel = supabase
        .channel(`list-${loaderData.listId}`)
        .on("broadcast", { event: "changed" }, ({ payload }) => {
          if (payload.clientId !== clientId) {
            toast.info("List updated by another user");
            revalidate();
          }
        })
        .subscribe();

      channelRef.current = channel;

      return () => {
        channelRef.current = null;
        supabase.removeChannel(channel);
      };
    },
    [loaderData.listId, clientId, revalidate],
  );

  // Broadcast change to other clients after a successful action
  useEffect(
    function broadcastChange() {
      if (!actionData || !channelRef.current) return;

      channelRef.current.send({
        type: "broadcast",
        event: "changed",
        payload: { clientId },
      });
    },
    [actionData, clientId],
  );

  const { form, fields, intent } = useForm(zList, {
    defaultValue,
    lastResult,
    shouldValidate: "onBlur",
    onValidate: (ctx) => {
      if (
        // we want to skip validation when deleting or undeleting items
        // so that the intent is sent server side
        ctx.intent?.type?.startsWith("undelete-item") ||
        ctx.intent?.type?.startsWith("delete-item")
      ) {
        return null;
      }

      return ctx;
    },
  });

  const itemsKey = defaultValue.items
    .map((i) => `${i.id}:${i.value}`)
    .join(",");

  // Track previous actionData to detect when updates came from our own action
  const prevActionDataRef = useRef(actionData);

  useEffect(
    function updateFormWithNewValues() {
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
    [
      itemsKey,
      intent,
      actionData,
      fields.items.name,
      defaultValue.items,
      form.id,
    ],
  );

  const lastDeleted = actionData?.lastDeleted || loaderData.lastDeleted;

  const edited =
    useFormData(form.id, (formData) => {
      const submission = parseSubmission(formData);

      const result = zList.safeParse(submission.payload);

      if (!result.success) {
        return [];
      }

      return defaultValue.items
        .filter(
          ({ value, id }) =>
            result.data.items?.find((item) => item?.id === id)?.value !== value,
        )
        .map(({ id }) => id);
    }) || [];

  if (loaderData.error) {
    return (
      <div>
        <h1>{defaultValue.name}</h1>
        <p>{loaderData.error}</p>
        <Link to="/">back to dir</Link>
      </div>
    );
  }

  return (
    <Form
      {...form.props}
      validationErrors={form.fieldErrors}
      method="POST"
      className={styles.form}
    >
      <h1>{defaultValue.name}</h1>
      {/* hidden submit button which will be used if a user presses enter or reorders */}
      <button
        ref={reorderSubmitRef}
        type="submit"
        value="new"
        name="new-submit"
        className={styles.hiddenSubmit}
      >
        Submit
      </button>

      <input
        name={fields.name.name}
        id={fields.name.id}
        defaultValue={fields.name.defaultValue}
        type="hidden"
      />

      <div className={styles.items}>
        <div className={styles.itemsScroll}>
          <Items
            fieldMetadata={fields.items}
            edited={edited}
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
        </div>
      </div>

      <div className={styles.actions}>
        <div>
          <label htmlFor={fields.name.id}>New</label>
          <input name={fields.new.name} id={fields.new.id} autoFocus />
          <Button
            type="submit"
            value="new"
            name="new-submit"
            className={styles.submitButton}
          >
            submit
          </Button>
        </div>

        <div>
          {lastDeleted ? (
            <button
              type="submit"
              name="__INTENT__"
              value={`undelete-item-${lastDeleted.id}`}
              className={styles.undoButton}
            >
              {" "}
              undo for: {lastDeleted.value}
            </button>
          ) : null}
          <Link variant="button" to="/">
            back to dir
          </Link>

          <Link
            variant="button"
            to="./confirm-delete"
            relative="route"
            className={styles.deleteLink}
          >
            Delete list
          </Link>
        </div>
      </div>
    </Form>
  );
}
