import { type Context, Hono } from "hono";
import * as v from "valibot";
import {
  type AppStyle,
  appStyles,
  DEFAULT_APP_STYLE,
  serializeAppStyleCookie,
} from "../../lib/app-style.ts";
import { isColorScheme, serializeColorSchemeCookie } from "../../lib/color-scheme.ts";
import {
  LAUNCH_PARAM,
  readDefaultListId,
  serializeDefaultListCookie,
} from "../../lib/default-list.ts";
import { resolveSlug, slugify } from "../../lib/slugify.ts";
import { redirectWithFlash } from "../flash.ts";
import { type Html, html } from "../html.ts";
import { renderPage } from "../page.ts";
import type { AppEnv, Supabase } from "../supabase.ts";
import {
  actionLabel,
  actionsBar,
  checkboxField,
  colorSchemeToggle,
  icons,
  notifications,
  offlineIndicator,
  pageHeader,
  closeButton,
  routeDialog,
  scrollArea,
  visuallyHidden,
} from "../views/components.ts";
import { styleDialog } from "../views/style-dialog.ts";

export const home = new Hono<AppEnv>();

type HomeContext = Context<AppEnv>;

// Postgres unique_violation, surfaced by PostgREST as `error.code`.
const UNIQUE_VIOLATION = "23505";

const zUuid = v.pipe(v.string(), v.uuid());

interface HomeList {
  id: string;
  name: string;
  slug: string;
  isOwner: boolean;
  totalCount: number;
  unreadCount: number;
}

async function loadLists(supabase: Supabase, userId: string): Promise<HomeList[]> {
  const [lists, views] = await Promise.all([
    supabase
      .from("lists")
      .select("id, name, slug, user_id, list_items(updated_at, state)")
      .eq("state", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("list_views").select("list_id, viewed_at").eq("user_id", userId),
  ]);
  if (lists.error) throw lists.error;
  if (views.error) throw views.error;

  const viewedAt = new Map(views.data.map((view) => [view.list_id, view.viewed_at]));
  return lists.data.map(({ list_items, user_id, ...list }) => {
    const active = list_items.filter((item) => item.state === "active");
    return {
      ...list,
      isOwner: user_id === userId,
      totalCount: active.length,
      unreadCount: active.filter((item) => item.updated_at > (viewedAt.get(list.id) ?? 0)).length,
    };
  });
}

function listRow(list: HomeList, defaultListId: string | null) {
  const { id, name, slug, isOwner, totalCount, unreadCount } = list;
  const isDefault = defaultListId === id;
  return html`<li
    class="home-item-wrapper"
    data-reorder-id="${id}"
    style="view-transition-name: list-${id}"
  >
    <div class="home-item">
      <a class="button-link home-item-link" href="/lists/${slug}">${name}</a>
      ${
        isOwner
          ? html`<a class="button button-primary home-item-config" href="/config/${slug}">
              ${visuallyHidden("Configure")}${icons.cog}
            </a>`
          : ""
      }
      <form method="post" action="/default-list" class="home-item-star">
        <input type="hidden" name="list-id" value="${isDefault ? "" : id}" />
        <button
          type="submit"
          class="home-item-star-button"
          aria-pressed="${String(isDefault)}"
          title="${isDefault ? "Opens when the app launches" : "Open when the app launches"}"
        >
          ${visuallyHidden(`Open ${name} on launch`)}
          <span aria-hidden="true">${isDefault ? "★" : "☆"}</span>
        </button>
      </form>
      <div class="reorder home-reorder">
        <span
          class="home-item-drag-handle reorder-grip"
          role="img"
          aria-label="Reorder ${name}"
          data-drag-handle
          draggable="true"
        >
          ${icons.grip}
        </span>
        <form method="post" action="/lists-order" class="reorder-buttons">
          <input type="hidden" name="id" value="${id}" />
          <button type="submit" name="direction" value="up" class="reorder-button">
            ${visuallyHidden(`Move ${name} up`)}<span aria-hidden="true">▲</span>
          </button>
          <button type="submit" name="direction" value="down" class="reorder-button">
            ${visuallyHidden(`Move ${name} down`)}<span aria-hidden="true">▼</span>
          </button>
        </form>
      </div>
      <span class="home-item-status">
        ${
          unreadCount > 0
            ? html`<span class="home-unread-badge" aria-label="${unreadCount} unread">
                ${unreadCount}${visuallyHidden(" unread of ")}
              </span>`
            : ""
        }
        <span class="home-item-total">${totalCount}${visuallyHidden(" items")}</span>
      </span>
    </div>
  </li>`;
}

interface HomeOptions {
  dialog?: Html;
  formErrors?: string[];
  newListValue?: string;
  status?: 200 | 422;
}

async function homePage(
  c: HomeContext,
  { dialog, formErrors, newListValue, status }: HomeOptions = {},
) {
  const supabase = c.get("supabase");
  const user = c.get("user");
  const [lists, waitlist] = await Promise.all([
    loadLists(supabase, user.id),
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
  ]);
  const pending = waitlist.count ?? 0;
  const defaultListId = readDefaultListId(c.req.header("Cookie"));

  return renderPage(c, {
    title: "Home | Shorpin",
    status,
    checkAccountStyle: true,
    scripts: ["home"],
    body: ({ flash, colorScheme }) =>
      html` ${offlineIndicator()}
      ${pageHeader({
        isHome: true,
        crumbs: [{ label: "Home" }],
        actions: [
          ...(pending > 0
            ? [
                html`<a class="button-link" href="/sign-ups"
                  >${pending} ${actionLabel("pending")}</a
                >`,
              ]
            : []),
          html`<form method="post" action="/logout" data-sign-out>
            <button type="submit" class="button button-primary">
              ${icons.power}${actionLabel("Sign out")}
            </button>
          </form>`,
        ],
      })}
      ${notifications(flash)}
      ${scrollArea(
        html`<nav class="home-list-wrapper">
          <ul
            class="home-list"
            id="home-lists"
            data-swap
            data-reorder-list="lists"
            data-reorder-action="/lists-order"
          >
            ${lists.map((list) => listRow(list, defaultListId))}
          </ul>
        </nav>`,
      )}
      ${actionsBar(
        html`<div class="home-actions">
          <form method="post" action="/" class="home-add-list-form" data-offline-queue="home">
            ${formErrors?.map((error) => html`<p class="home-form-error" role="alert">${error}</p>`) ?? ""}
            <div class="home-new-list">
              <label for="new-list" class="visually-hidden">New list</label>
              <input
                name="new-list"
                id="new-list"
                autocomplete="off"
                required
                class="home-new-list-input"
                value="${newListValue ?? ""}"
              />
              <button type="submit" class="button button-solid">Add</button>
            </div>
          </form>
          <div class="home-appearance">
            <a class="button button-outline" href="/style">${icons.brush}Style</a>
            ${colorSchemeToggle(colorScheme, "/")}
          </div>
        </div>`,
      )}
      ${dialog ?? ""}`,
  });
}

// --- Home ---

home.get("/", async (c) => {
  // PWA launches (manifest start_url) always redirect away from `/?launch`,
  // into the starred list if there is one.
  if (c.req.query(LAUNCH_PARAM) !== undefined) {
    const id = readDefaultListId(c.req.header("Cookie"));
    if (!id) return c.redirect("/", 303);
    const { data: list } = await c
      .get("supabase")
      .from("lists")
      .select("slug")
      .eq("id", id)
      .eq("state", "active")
      .maybeSingle();
    // Re-issued on each launch so the cookie stays server-set (no 7-day
    // Safari cap on script-written storage) and its expiry slides.
    c.header("Set-Cookie", serializeDefaultListCookie(list ? id : null));
    return c.redirect(list ? `/lists/${list.slug}` : "/", 303);
  }
  return homePage(c);
});

home.post("/", async (c) => {
  const body = await c.req.parseBody();
  const name = typeof body["new-list"] === "string" ? body["new-list"].trim() : "";
  if (!name) return homePage(c, { formErrors: ["List name is required"], status: 422 });

  const supabase = c.get("supabase");
  const user = c.get("user");
  const failed = () =>
    homePage(c, {
      formErrors: ["Failed to create list. Please try again."],
      newListValue: name,
      status: 422,
    });

  const { data: owned, error: ownedError } = await supabase
    .from("lists")
    .select("sort_order")
    .eq("user_id", user.id)
    .eq("state", "active");
  if (ownedError) return failed();
  const sortOrder = Math.max(-1, ...owned.map((list) => list.sort_order)) + 1;

  // `lists.slug` is unique across every row, including deleted lists.
  const baseSlug = slugify(name) || "list";
  const { data: matches } = await supabase
    .from("lists")
    .select("slug")
    .like("slug", `${baseSlug}%`);
  let slug = resolveSlug(baseSlug, matches?.map((match) => match.slug) ?? []);

  const insert = (candidate: string) =>
    supabase
      .from("lists")
      .insert({ name, slug: candidate, user_id: user.id, sort_order: sortOrder });
  let { error } = await insert(slug);
  // RLS hides other users' lists from the lookup above, so the slug can still
  // collide: fall back to a random suffix rather than probing.
  for (let attempt = 0; error?.code === UNIQUE_VIOLATION && attempt < 3; attempt++) {
    slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
    ({ error } = await insert(slug));
  }
  if (error) {
    console.error("Error creating list:", error);
    return failed();
  }
  return redirectWithFlash(c, `/lists/${slug}`, "success", `List "${name}" created successfully!`);
});

// --- Reorder lists ---

/**
 * Two shapes: `id` + `direction` from the ↑/↓ buttons, or the whole order
 * (`order`, repeated) after a drag. Only the user's own lists move; shared
 * lists keep the owner's order.
 */
home.post("/lists-order", async (c) => {
  const body = await c.req.formData();
  const supabase = c.get("supabase");
  const user = c.get("user");

  const { data: rows, error } = await supabase
    .from("lists")
    .select("id, user_id")
    .eq("user_id", user.id)
    .eq("state", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return redirectWithFlash(c, "/", "error", "Couldn't reorder your lists.");
  const owned = rows.filter((row) => row.user_id === user.id);

  let order = owned.map(({ id }) => id);
  const submitted = body.getAll("order").filter((id): id is string => typeof id === "string");
  if (submitted.length > 0) {
    const ownedSet = new Set(order);
    order = submitted.filter((id) => ownedSet.has(id));
  } else {
    const id = String(body.get("id") ?? "");
    const from = order.indexOf(id);
    const to = from + (body.get("direction") === "up" ? -1 : 1);
    if (from >= 0 && to >= 0 && to < order.length) order.splice(to, 0, ...order.splice(from, 1));
  }

  const results = await Promise.all(
    order.map((id, sortOrder) =>
      supabase
        .from("lists")
        .update({ sort_order: sortOrder, updated_at: Date.now() })
        .eq("id", id)
        .eq("user_id", user.id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) console.error("Error reordering lists:", failed.error);

  if (c.req.header("X-Enhance")) return c.body(null, 204);
  return c.redirect("/", 303);
});

// --- Default list on launch ---

home.post("/default-list", async (c) => {
  const value = String((await c.req.formData()).get("list-id") ?? "");
  const listId = v.is(zUuid, value) ? value : null;
  c.header("Set-Cookie", serializeDefaultListCookie(listId));
  if (c.req.header("X-Enhance")) return c.body(null, 204);
  return c.redirect("/", 303);
});

// --- Colour scheme (a device preference: cookie only) ---

home.post("/color-scheme", async (c) => {
  const body = await c.req.formData();
  const scheme = body.get("scheme");
  if (isColorScheme(scheme)) c.header("Set-Cookie", serializeColorSchemeCookie(scheme));
  const returnTo = String(body.get("return-to") ?? "/");
  // Only same-site paths, so this can't be used as an open redirect.
  return c.redirect(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/", 303);
});

// --- Account style ---

home.get("/style", async (c) => {
  const supabase = c.get("supabase");
  const { data } = await supabase
    .from("profiles")
    .select("app_style")
    .eq("id", c.get("user").id)
    .maybeSingle();
  const value = (
    Object.hasOwn(appStyles, data?.app_style ?? "") ? data?.app_style : DEFAULT_APP_STYLE
  ) as AppStyle;
  return homePage(c, { dialog: styleDialog({ title: "Style", value, closeUrl: "/" }) });
});

home.post("/style", async (c) => {
  const style = (await c.req.formData()).get("style");
  if (typeof style !== "string" || !Object.hasOwn(appStyles, style))
    return c.redirect("/style", 303);
  const { error } = await c
    .get("supabase")
    .from("profiles")
    .update({ app_style: style === DEFAULT_APP_STYLE ? null : style })
    .eq("id", c.get("user").id);
  if (error) {
    console.error("Error saving app style:", error);
    return redirectWithFlash(c, "/style", "error", "Couldn't save your style. Please try again.");
  }
  c.header("Set-Cookie", serializeAppStyleCookie(style as AppStyle));
  return c.redirect("/", 303);
});

// --- Sign-ups (admins: the waitlist is only readable by them) ---

home.get("/sign-ups", async (c) => {
  const { data, error } = await c
    .get("supabase")
    .from("waitlist")
    .select("id, email, first_name, last_name, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "short" });
  return homePage(c, {
    dialog: routeDialog({
      closeUrl: "/",
      labelledBy: "sign-ups-heading",
      content: html`<h2 id="sign-ups-heading">Pending sign-ups</h2>
        <div class="modal-body">
          ${
            data.length === 0
              ? html`<p>No pending sign-ups.</p>`
              : html`<form id="sign-ups-form" method="post">
                  ${data.map(({ id, email, first_name, last_name, created_at }) =>
                    checkboxField({
                      id: `sign-up-${id}`,
                      name: "ids",
                      value: id,
                      label: html`${first_name} ${last_name} — ${email} at
                        <time datetime="${created_at}"
                          >${dateFormat.format(new Date(created_at))}</time
                        >`,
                    }),
                  )}
                </form>`
          }
        </div>
        <div class="modal-actions">
          ${closeButton("Close")}
          <button type="submit" form="sign-ups-form" class="button button-primary">
            Mark as handled
          </button>
        </div>`,
    }),
  });
});

home.post("/sign-ups", async (c) => {
  const ids = (await c.req.formData()).getAll("ids").filter((id) => typeof id === "string");
  if (ids.length === 0) return c.redirect("/sign-ups", 303);
  const { error } = await c.get("supabase").from("waitlist").delete().in("id", ids);
  if (error) throw error;
  return redirectWithFlash(c, "/", "success", "Sign-ups handled.");
});

// --- Collaborators (the owner's list settings) ---

async function loadOwnedList(c: HomeContext, slug: string) {
  const { data } = await c
    .get("supabase")
    .from("lists")
    .select("id, name, user_id")
    .eq("slug", slug)
    .eq("state", "active")
    .maybeSingle();
  if (!data) return { error: "List not found." } as const;
  if (data.user_id !== c.get("user").id) {
    return { error: "Only the list owner can manage settings." } as const;
  }
  return { list: data } as const;
}

home.get("/config/:list", async (c) => {
  const slug = c.req.param("list");
  const owned = await loadOwnedList(c, slug);
  if (!owned.list) return redirectWithFlash(c, "/", "error", owned.error);

  const supabase = c.get("supabase");
  const [{ data: profiles }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("id, email").neq("id", c.get("user").id),
    supabase.from("list_members").select("user_id").eq("list_id", owned.list.id),
  ]);
  const memberIds = new Set(members?.map((member) => member.user_id));

  return homePage(c, {
    dialog: routeDialog({
      closeUrl: "/",
      labelledBy: "config-heading",
      content: html`<h2 id="config-heading">${owned.list.name} — Admin</h2>
        <div class="modal-body">
          ${
            !profiles?.length
              ? html`<p>No other users yet.</p>`
              : html`<form id="config-form" method="post">
                  <fieldset>
                    <legend>Select collaborators</legend>
                    ${profiles.map(({ id, email }) =>
                      checkboxField({
                        id,
                        name: "member-ids",
                        value: id,
                        checked: memberIds.has(id),
                        label: email,
                      }),
                    )}
                  </fieldset>
                </form>`
          }
        </div>
        <div class="modal-actions">
          <a
            class="button button-destructive config-delete-list"
            href="/lists/${slug}/confirm-delete"
            >Delete list</a
          >
          ${closeButton("Close")}
          <button type="submit" form="config-form" class="button button-primary">Save</button>
        </div>`,
    }),
  });
});

home.post("/config/:list", async (c) => {
  const owned = await loadOwnedList(c, c.req.param("list"));
  if (!owned.list) return redirectWithFlash(c, "/", "error", owned.error);
  const listId = owned.list.id;

  const supabase = c.get("supabase");
  const submitted = new Set(
    (await c.req.formData()).getAll("member-ids").filter((id) => typeof id === "string"),
  );
  const { data: rows } = await supabase
    .from("list_members")
    .select("user_id")
    .eq("list_id", listId);
  const current = new Set(rows?.map((row) => row.user_id));

  const toAdd = [...submitted].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !submitted.has(id));
  const failed = () =>
    redirectWithFlash(c, "/", "error", "Failed to update collaborators. Please try again.");

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("list_members")
      .insert(toAdd.map((user_id) => ({ list_id: listId, user_id })));
    if (error) return failed();
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("list_members")
      .delete()
      .eq("list_id", listId)
      .in("user_id", toRemove);
    if (error) return failed();
  }
  return redirectWithFlash(c, "/", "success", "changed collaborators");
});

// --- Delete a list ---

home.get("/lists/:list/confirm-delete", async (c) => {
  const slug = c.req.param("list");
  const owned = await loadOwnedList(c, slug);
  if (!owned.list) {
    return owned.error === "List not found."
      ? c.notFound()
      : redirectWithFlash(c, "/", "error", "Only the list owner can delete this list.");
  }
  const referer = c.req.header("Referer");
  const returnTo =
    referer && new URL(referer).origin === new URL(c.req.url).origin
      ? new URL(referer).pathname
      : "/";

  return renderPage(c, {
    title: `Delete ${owned.list.name} | Shorpin`,
    body: ({ flash }) =>
      html` ${pageHeader({ crumbs: [{ label: owned.list.name, href: `/lists/${slug}` }, { label: "Delete" }] })}
        ${notifications(flash)}
        <form method="post" class="delete-form">
          <h1>Delete?</h1>
          <p>Are you sure?</p>
          <div class="delete-actions">
            <button type="submit" class="button button-destructive">Yes</button>
            <a class="button button-outline" href="${returnTo}">I do not</a>
          </div>
        </form>`,
  });
});

home.post("/lists/:list/confirm-delete", async (c) => {
  const slug = c.req.param("list");
  const owned = await loadOwnedList(c, slug);
  if (!owned.list) {
    return redirectWithFlash(c, "/", "error", "Only the list owner can delete this list.");
  }
  const { error } = await c
    .get("supabase")
    .from("lists")
    .update({ state: "deleted", updated_at: Date.now() })
    .eq("slug", slug);
  if (error) {
    console.error("Error deleting list:", error);
    return redirectWithFlash(c, "/", "error", "Failed to delete list. Please try again.");
  }
  return redirectWithFlash(c, "/", "success", `List ${slug} deleted successfully`);
});
