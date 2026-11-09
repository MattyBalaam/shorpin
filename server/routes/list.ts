import { type Context, Hono } from "hono";
import { streamSSE } from "hono/streaming";
import * as v from "valibot";
import { type AppStyle, appStyles, INHERIT_APP_STYLE, isAppStyle } from "../../lib/app-style.ts";
import { getFirstLink } from "../../lib/extract-link.ts";
import { formatItemTag, groupByTag, listTags, parseItemTag } from "../../lib/item-tag.ts";
import { generateThemeColors, toAdaptiveCss, toDarkModeCss } from "../../lib/palette.ts";
import { redirectWithFlash } from "../flash.ts";
import { type Html, html } from "../html.ts";
import { renderPage, resolveAppStyle } from "../page.ts";
import { publish, subscribe } from "../realtime.ts";
import type { AppEnv, Supabase } from "../supabase.ts";
import {
  actionLabel,
  actionsBar,
  icons,
  iconSprite,
  spriteIcons,
  notifications,
  offlineIndicator,
  pageHeader,
  routeDialog,
  scrollArea,
  visuallyHidden,
} from "../views/components.ts";
import { styleDialog } from "../views/style-dialog.ts";

export const list = new Hono<AppEnv>();

type ListContext = Context<AppEnv>;

interface Item {
  id: string;
  value: string;
  state: "active" | "deleted";
  sortOrder: number;
  updatedAt: number;
}

interface LoadedList {
  id: string;
  name: string;
  slug: string;
  themePrimary: string | null;
  themeSecondary: string | null;
  themeStyle: AppStyle | null;
  /** Active items, in order. */
  items: Item[];
  /** Soft-deleted items, newest first. */
  deleted: Item[];
}

const zUuid = v.pipe(v.string(), v.uuid());
// Only colours the palette generator makes are accepted back.
const zColour = v.pipe(v.string(), v.regex(/^oklch\([\d.\s]+\)$/));

async function loadList(supabase: Supabase, slug: string): Promise<LoadedList | null> {
  const { data, error } = await supabase
    .from("lists")
    .select(
      "id, name, slug, theme_primary, theme_secondary, theme_style, list_items(id, value, state, sort_order, updated_at)",
    )
    .eq("slug", slug)
    .eq("state", "active")
    .order("sort_order", { referencedTable: "list_items", ascending: true })
    .maybeSingle();
  if (error) {
    console.error("Error loading list:", error);
    // A network failure isn't a missing list: let the error page (or the
    // service worker's cached copy) handle it.
    if (!error.code) throw new Error("Service unavailable");
  }
  if (!data) return null;

  const all: Item[] = data.list_items.map((item) => ({
    id: item.id,
    value: item.value,
    state: item.state,
    sortOrder: item.sort_order,
    updatedAt: item.updated_at,
  }));
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    themePrimary: data.theme_primary,
    themeSecondary: data.theme_secondary,
    themeStyle: isAppStyle(data.theme_style) ? data.theme_style : null,
    items: all.filter((item) => item.state === "active").sort((a, b) => a.sortOrder - b.sortOrder),
    deleted: all
      .filter((item) => item.state === "deleted")
      .sort((a, b) => b.updatedAt - a.updatedAt),
  };
}

/** Marks the list read up to now for this user. */
async function recordView(supabase: Supabase, listId: string, userId: string) {
  const { error } = await supabase
    .from("list_views")
    .upsert(
      { list_id: listId, user_id: userId, viewed_at: Date.now() },
      { onConflict: "list_id,user_id" },
    );
  if (error) console.error("Error recording list view:", error);
}

async function lastViewedAt(supabase: Supabase, listId: string, userId: string) {
  const { data } = await supabase
    .from("list_views")
    .select("viewed_at")
    .eq("list_id", listId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.viewed_at ?? 0;
}

// --- Views ---

function itemRow(item: Item, { slug, isNew }: { slug: string; isNew: boolean }) {
  const { text, tag } = parseItemTag(item.value);
  // Rows are named by their text alone, so adding a tag doesn't rename them.
  const label = text;
  const link = getFirstLink(text);
  const action = `/lists/${slug}/items`;

  return html`<li
    class="items-wrapper"
    id="item-${item.id}"
    data-reorder-id="${item.id}"
    style="view-transition-name: item-${item.id}"
  >
    <div class="item-container item-container-reorderable" data-new="${String(isNew)}">
      <div class="item-swipe-track">
        <div class="item-row">
          <span class="item-value"
            >${text}${
              isNew
                ? html`<span class="item-state"
                    >${visuallyHidden("new since last opening")}<span
                      aria-hidden="true"
                      class="item-new-indicator"
                      >new</span
                    ></span
                  >`
                : ""
            }</span
          >
          ${tag ? html`<span class="item-tag">${visuallyHidden("tag: ")}${tag}</span>` : ""}
          ${
            link
              ? html`<a class="item-link-button" href="${link}" target="_blank" rel="noreferrer"
                  >${visuallyHidden("Open link")}${icons.link}</a
                >`
              : ""
          }
          <button
            type="button"
            class="item-edit-button"
            aria-label="Edit ${label}"
            commandfor="edit-${item.id}"
            command="show-modal"
          >
            ${spriteIcons.edit}
          </button>
          <div class="reorder item-reorder">
            <span
              class="item-drag-handle reorder-grip"
              role="img"
              aria-label="Reorder ${label}"
              data-drag-handle
              draggable="true"
              >${spriteIcons.grip}</span
            >
            <form method="post" action="${action}" class="reorder-buttons" data-enhance>
              <input type="hidden" name="op" value="move" />
              <input type="hidden" name="id" value="${item.id}" />
              <button type="submit" name="direction" value="up" class="reorder-button">
                ${visuallyHidden(`Move ${label} up`)}<span aria-hidden="true">▲</span>
              </button>
              <button type="submit" name="direction" value="down" class="reorder-button">
                ${visuallyHidden(`Move ${label} down`)}<span aria-hidden="true">▼</span>
              </button>
            </form>
          </div>
          <form
            method="post"
            action="${action}"
            class="item-delete-button"
            id="delete-${item.id}"
            data-enhance
          >
            <input type="hidden" name="op" value="delete" />
            <input type="hidden" name="id" value="${item.id}" />
            <button type="submit" class="button button-primary item-delete-reorderable">
              ${visuallyHidden(`Delete ${label}`)}✕
            </button>
          </form>
        </div>
      </div>
      <button
        type="submit"
        form="delete-${item.id}"
        class="item-swipe-delete"
        tabindex="-1"
        aria-hidden="true"
      >
        Delete
      </button>
    </div>
    <dialog id="edit-${item.id}" class="modal-dialog" aria-label="Edit item" closedby="any">
      <form method="post" action="${action}" class="modal-content" data-enhance data-edit-form>
        <input type="hidden" name="op" value="edit" />
        <input type="hidden" name="id" value="${item.id}" />
        <div class="modal-body">
          <textarea
            class="item-edit-textarea"
            name="text"
            aria-label="Item"
            autocomplete="off"
            rows="3"
            required
          >
${text}</textarea>
          <label class="item-edit-tag">
            Tag
            <input
              name="tag"
              list="tags"
              value="${tag ?? ""}"
              autocomplete="off"
              class="item-edit-tag-input"
              placeholder="No tag"
            />
          </label>
        </div>
        <div class="modal-actions">
          <button
            type="button"
            commandfor="edit-${item.id}"
            command="close"
            class="button button-outline"
          >
            Cancel
          </button>
          <button type="submit" class="button button-primary">Save</button>
        </div>
      </form>
    </dialog>
  </li>`;
}

function palettePane(
  label: string,
  ink: "black" | "white",
  background: string,
  primary: string,
  secondary: string,
) {
  return html`<div class="palette-preview-pane" style="background: ${background}">
    <p class="palette-preview-pane-label" style="color: ${ink}">${label}</p>
    <div class="palette-preview-row" style="background: ${secondary}">
      <span class="palette-preview-line" style="background: ${ink}"></span>
      <span class="palette-preview-badge" style="background: ${primary}; color: ${ink}">New</span>
    </div>
    <div class="palette-preview-row" style="background: ${secondary}">
      <span class="palette-preview-line" style="background: ${ink}; width: 70%"></span>
    </div>
    <span
      class="palette-preview-button"
      style="background: ${primary}; color: ${ink}"
      aria-hidden="true"
      >Add</span
    >
  </div>`;
}

/**
 * A freshly generated palette to try. Opened in place by the Colours button
 * (an invoker command, no script); Shuffle reloads the page with the dialog
 * open on a new candidate.
 */
function paletteDialog(slug: string, open: boolean) {
  const { primary, secondary } = generateThemeColors();
  const content = html`<div class="modal-body">
      <div class="palette-preview-grid">
        ${palettePane("Light", "black", "#f5f5f5", primary, secondary)}
        ${palettePane("Dark", "white", "#1a1a1a", toDarkModeCss(primary), toDarkModeCss(secondary))}
      </div>
    </div>
    <form method="post" action="/lists/${slug}/items" class="modal-actions" data-enhance>
      <input type="hidden" name="op" value="palette" />
      <input type="hidden" name="primary" value="${primary}" />
      <input type="hidden" name="secondary" value="${secondary}" />
      ${
        open
          ? html`<a class="button button-outline" href="/lists/${slug}">Cancel</a>`
          : html`<button
              type="button"
              commandfor="palette-dialog"
              command="close"
              class="button button-outline"
            >
              Cancel
            </button>`
      }
      <a
        class="button button-primary"
        href="/lists/${slug}?colours=${crypto.randomUUID().slice(0, 8)}"
        >Shuffle</a
      >
      <button type="submit" class="button button-primary">Use these colours</button>
    </form>`;

  return open
    ? routeDialog({ id: "palette-dialog", closeUrl: `/lists/${slug}`, label: "Colours", content })
    : html`<dialog
        id="palette-dialog"
        data-swap
        class="modal-dialog"
        aria-label="Colours"
        closedby="any"
      >
        <div class="modal-content">${content}</div>
      </dialog>`;
}

interface ListPageOptions {
  dialog?: (list: LoadedList, accountStyle: AppStyle) => Html;
  status?: 200 | 422;
}

async function listPage(c: ListContext, { dialog, status }: ListPageOptions = {}) {
  const slug = c.req.param("list") ?? "";
  const supabase = c.get("supabase");
  const user = c.get("user");
  const loaded = await loadList(supabase, slug);

  if (!loaded) {
    return renderPage(c, {
      title: "List not found | Shorpin",
      status: 404,
      body: ({ flash }) =>
        html`${notifications(flash)}
          <div class="error-state">
            <p>List does not exist</p>
            <a class="button-link" href="/">Back to home</a>
          </div>`,
    });
  }

  // "New" is relative to the previous visit, read before this one is
  // recorded. Coming back to the list from itself (an action's redirect,
  // the style dialog) isn't a visit, so it doesn't clear the markers.
  const viewedAt = await lastViewedAt(supabase, loaded.id, user.id);
  const referer = c.req.header("Referer");
  const fromSameList = referer ? new URL(referer).pathname.startsWith(`/lists/${slug}`) : false;
  if (!fromSameList) await recordView(supabase, loaded.id, user.id);

  const deletedId = c.req.query("deleted");
  const recreatable = loaded.deleted.find((item) => item.id === deletedId);
  const showPalette = c.req.query("colours") !== undefined;
  const lastTag = c.req.query("tag") ?? "";
  const clientId = crypto.randomUUID();
  const tags = listTags(loaded.items);
  const accountStyle = await resolveAppStyle(c, false);
  const action = `/lists/${slug}/items`;

  // Always rendered (empty without a palette) so a swap can update it.
  const palette = html`<style id="list-palette" data-swap>
    ${
      loaded.themePrimary && loaded.themeSecondary
        ? `:root:root {
          --palette-primary: ${toAdaptiveCss(loaded.themePrimary)};
          --palette-secondary: ${toAdaptiveCss(loaded.themeSecondary)};
        }`
        : ""
    }
  </style>`;

  return renderPage(c, {
    title: `${loaded.name} | Shorpin`,
    status,
    styleOverride: loaded.themeStyle ?? accountStyle,
    scripts: ["list"],
    head: palette,
    body: ({ flash }) =>
      html` ${offlineIndicator()}
        ${pageHeader({
          compactBelow: "27rem",
          crumbs: [{ label: loaded.name }],
          actions: [
            html`<a class="button button-outline" href="/lists/${slug}/style"
              >${icons.brush}${actionLabel("Style")}</a
            >`,
            html`<button
              type="button"
              class="button button-primary"
              commandfor="palette-dialog"
              command="show-modal"
            >
              ${icons.palette}${actionLabel("Colours")}
            </button>`,
            html`<form method="post" action="${action}" data-enhance>
              <input type="hidden" name="op" value="group" />
              <button type="submit" class="button button-outline">
                ${icons.group}${actionLabel("Group by tag")}
              </button>
            </form>`,
          ],
        })}
        ${notifications(flash)}
        <div
          class="list-form"
          data-list
          data-list-id="${loaded.id}"
          data-slug="${slug}"
          data-client-id="${clientId}"
        >
          ${scrollArea(
            html`<ul
              class="items-list"
              id="list-items"
              data-swap
              data-reorder-list="items"
              data-reorder-action="${action}"
            >
              ${loaded.items.map((item) =>
                itemRow(item, { slug, isNew: item.updatedAt > viewedAt }),
              )}
              ${loaded.items.length === 0 ? html`<li class="items-empty-state">No items yet — add one below</li>` : ""}
            </ul>`,
          )}
          ${actionsBar(
            html`<form
              method="post"
              action="${action}"
              class="list-actions"
              id="add-form"
              data-enhance
              data-add-form
            >
              <input type="hidden" name="op" value="add" />
              <input type="hidden" name="id" value="${crypto.randomUUID()}" />
              <label for="new-item" class="visually-hidden">New item</label>
              <input
                id="new-item"
                name="text"
                autofocus
                autocomplete="off"
                required
                class="list-add-input"
              />
              <span class="list-add-tag">
                <label for="new-tag" class="visually-hidden">Tag</label>
                <input
                  id="new-tag"
                  name="tag"
                  list="tags"
                  placeholder="No tag"
                  autocomplete="off"
                  value="${lastTag}"
                  class="list-add-input list-add-tag-input"
                />
              </span>
              <button type="submit" class="button button-solid list-add-button">Add</button>
              <span id="undo-slot" data-swap class="list-undo-slot"
                >${
                  recreatable
                    ? html`<button
                        type="submit"
                        form="recreate-form"
                        class="button button-outline list-undo-button"
                      >
                        ${visuallyHidden("Recreate last deleted")}${icons.undo}
                      </button>`
                    : ""
                }</span
              >
            </form>`,
          )}
        </div>
        ${iconSprite}
        <datalist id="tags" data-swap>
          ${tags.map((tag) => html`<option value="${tag}"></option>`)}
        </datalist>
        <div id="recreate-slot" data-swap>
          ${
            recreatable
              ? html`<form method="post" action="${action}" id="recreate-form" hidden data-enhance>
                  <input type="hidden" name="op" value="recreate" />
                  <input type="hidden" name="id" value="${recreatable.id}" />
                  <input type="hidden" name="new-id" value="${crypto.randomUUID()}" />
                </form>`
              : ""
          }
        </div>
        ${showPalette ? "" : paletteDialog(slug, false)}
        ${showPalette ? paletteDialog(slug, true) : ""}
        ${dialog ? dialog(loaded, accountStyle) : ""}`,
  });
}

list.get("/lists/:list", (c) => listPage(c));

list.get("/lists/:list/style", (c) =>
  listPage(c, {
    dialog: (loaded, accountStyle) =>
      styleDialog({
        title: "List style",
        value: loaded.themeStyle,
        inherit: accountStyle,
        closeUrl: `/lists/${loaded.slug}`,
      }),
  }),
);

list.post("/lists/:list/style", async (c) => {
  const slug = c.req.param("list");
  const style = (await c.req.formData()).get("style");
  const valid =
    style === INHERIT_APP_STYLE || (typeof style === "string" && Object.hasOwn(appStyles, style));
  if (!valid) return c.redirect(`/lists/${slug}/style`, 303);

  // Any member may: see the "members can update accessible lists" policy.
  const { error } = await c
    .get("supabase")
    .from("lists")
    .update({ theme_style: style === INHERIT_APP_STYLE ? null : style })
    .eq("slug", slug);
  if (error) {
    console.error("Error saving list style:", error);
    return redirectWithFlash(
      c,
      `/lists/${slug}/style`,
      "error",
      "Couldn't save the list style. Please try again.",
    );
  }
  return c.redirect(`/lists/${slug}`, 303);
});

// --- Mutations ---

/**
 * Every list change is one small form post naming the item it acts on.
 * Each op writes only the rows it touches, so concurrent edits from other
 * members (or a replayed offline queue) can't clobber anything else — unlike
 * submitting the whole list, which needed a three-way merge to replay
 * safely. Adds carry a client-made id, so posting one twice is a no-op.
 */
list.post("/lists/:list/items", async (c) => {
  const slug = c.req.param("list");
  const form = await c.req.formData();
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  const op = field("op");
  const clientId = field("client-id") || null;
  const supabase = c.get("supabase");
  const user = c.get("user");
  const listUrl = `/lists/${slug}`;

  const loaded = await loadList(supabase, slug);
  if (!loaded) return redirectWithFlash(c, "/", "error", "List does not exist");

  const now = Date.now();
  const params = new URLSearchParams();
  const failed = (error: unknown) => {
    console.error(`Error applying ${op} to ${slug}:`, error);
    return redirectWithFlash(c, listUrl, "error", "Failed to update list. Please try again.");
  };
  const nextSortOrder = () =>
    Math.max(0, ...[...loaded.items, ...loaded.deleted].map((item) => item.sortOrder)) + 1;

  /** Adds a row, ignoring a repeat of the same id (a replayed post). */
  const insertItem = (id: string, value: string) =>
    supabase.from("list_items").upsert(
      {
        id,
        list_id: loaded.id,
        value,
        state: "active",
        sort_order: nextSortOrder(),
        updated_at: now,
        updated_by: user.id,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

  /** Writes a new order, touching only rows whose position changed. */
  const saveOrder = async (ids: string[]) => {
    const changed = ids.flatMap((id, sortOrder) =>
      loaded.items.find((item) => item.id === id)?.sortOrder === sortOrder
        ? []
        : [{ id, sortOrder }],
    );
    const results = await Promise.all(
      changed.map(({ id, sortOrder }) =>
        supabase
          .from("list_items")
          .update({ sort_order: sortOrder, updated_at: now })
          .eq("id", id)
          .eq("list_id", loaded.id),
      ),
    );
    return results.find((result) => result.error)?.error ?? null;
  };

  switch (op) {
    case "add": {
      const text = field("text").trim();
      const tag = field("tag").trim();
      if (!text) return c.redirect(listUrl, 303);
      // A tag typed into the text ("Milk [dairy]") wins over the picker.
      const value = parseItemTag(text).tag ? text : formatItemTag(text, tag);
      const id = v.is(zUuid, field("id")) ? field("id") : crypto.randomUUID();
      const { error } = await insertItem(id, value);
      if (error) return failed(error);
      // Keeps the tag for the next add, for a run of items with one tag.
      if (tag) params.set("tag", tag);
      break;
    }

    case "edit": {
      const id = field("id");
      const text = field("text").trim();
      if (!text) return c.redirect(listUrl, 303);
      const value = formatItemTag(text, field("tag").trim() || null);
      const current = loaded.items.find((item) => item.id === id);
      if (!current || current.value === value) return c.redirect(listUrl, 303);
      const { error } = await supabase
        .from("list_items")
        .update({ value, updated_at: now, updated_by: user.id })
        .eq("id", id)
        .eq("list_id", loaded.id);
      if (error) return failed(error);
      break;
    }

    case "delete": {
      const id = field("id");
      if (!loaded.items.some((item) => item.id === id)) {
        // Already gone (another member, or a replay): nothing to do.
        return c.redirect(listUrl, 303);
      }
      const { error } = await supabase
        .from("list_items")
        .update({ state: "deleted", updated_at: now, updated_by: user.id })
        .eq("id", id)
        .eq("list_id", loaded.id);
      if (error) return failed(error);
      // Keep the ten most recent deletions; older ones go for good.
      const expired = loaded.deleted.slice(9).map((item) => item.id);
      if (expired.length > 0) await supabase.from("list_items").delete().in("id", expired);
      params.set("deleted", id);
      break;
    }

    case "recreate": {
      // Re-adds the value as a fresh item at the end: "recreate", not undo.
      const deleted = loaded.deleted.find((item) => item.id === field("id"));
      if (!deleted) return c.redirect(listUrl, 303);
      const id = v.is(zUuid, field("new-id")) ? field("new-id") : crypto.randomUUID();
      const { error } = await insertItem(id, deleted.value);
      if (error) return failed(error);
      break;
    }

    case "move": {
      const ids = loaded.items.map((item) => item.id);
      const id = field("id");
      const from = ids.indexOf(id);
      if (from < 0) return c.redirect(listUrl, 303);
      ids.splice(from, 1);
      if (form.has("after")) {
        // From a drag: placed after a named item, or first when empty.
        const after = field("after");
        ids.splice(after ? ids.indexOf(after) + 1 : 0, 0, id);
      } else {
        const to = Math.max(0, Math.min(ids.length, from + (field("direction") === "up" ? -1 : 1)));
        ids.splice(to, 0, id);
      }
      const error = await saveOrder(ids);
      if (error) return failed(error);
      break;
    }

    case "group": {
      // A one-off reorder, shared with every member, not a local view.
      const grouped = groupByTag(loaded.items);
      if (grouped.every((id, index) => id === loaded.items[index]?.id)) {
        return redirectWithFlash(c, listUrl, "info", "Already grouped by tag");
      }
      const error = await saveOrder(grouped);
      if (error) return failed(error);
      break;
    }

    case "palette": {
      const primary = v.safeParse(zColour, field("primary"));
      const secondary = v.safeParse(zColour, field("secondary"));
      if (!primary.success || !secondary.success) return c.redirect(listUrl, 303);
      const { error } = await supabase
        .from("lists")
        .update({ theme_primary: primary.output, theme_secondary: secondary.output })
        .eq("id", loaded.id);
      if (error) return failed(error);
      break;
    }

    default:
      return c.text("Unknown operation", 400);
  }

  // Your own changes are never "new" to you.
  await recordView(supabase, loaded.id, user.id);
  publish(loaded.id, clientId);

  const query = params.size > 0 ? `?${params}` : "";
  return c.redirect(`${listUrl}${query}`, 303);
});

// --- Live updates ---

/**
 * Server-sent events: a "changed" event whenever another member changes the
 * list. The page re-fetches itself in response; no data rides on the event.
 */
list.get("/lists/:list/events", async (c) => {
  const loaded = await loadList(c.get("supabase"), c.req.param("list"));
  if (!loaded) return c.notFound();
  const clientId = c.req.query("client") ?? null;

  c.header("Cache-Control", "no-cache, no-transform");
  return streamSSE(c, async (stream) => {
    const unsubscribe = subscribe(loaded.id, (source) => {
      if (source === clientId) return;
      void stream.writeSSE({ event: "changed", data: "" });
    });
    stream.onAbort(unsubscribe);
    // Comments keep proxies from timing the stream out.
    while (!stream.aborted) {
      await stream.sleep(25_000);
      if (!stream.aborted) await stream.write(": ping\n\n");
    }
    unsubscribe();
  });
});
