import { createForm, Field, Form, reset, setErrors } from "@formisch/solid/v2";
import { isServer } from "@solidjs/web";
import { createFileRoute, isRedirect, Outlet, redirect, useRouter } from "@tanstack/solid-router";
import { createEffect, createSignal, For, onSettled, Show } from "solid-js";
import { Actions } from "~/components/actions/actions";
import { Button } from "~/components/button/button";
import { ColorSchemeToggle } from "~/components/color-scheme/color-scheme";
import { BrushIcon, PowerIcon } from "~/components/icon/icons";
import { Link } from "~/components/link/link";
import { useIsOnline } from "~/components/online-status/online-status";
import { ActionLabel, PageHeader } from "~/components/page-header/page-header";
import { ScrollArea } from "~/components/scroll-area/scroll-area";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import { LAUNCH_PARAM, readDefaultListId, serializeDefaultListCookie } from "~/lib/default-list";
import { isNetworkOrServerError } from "~/lib/network-error";
import { clearAllOfflineData, listQueuedMutations } from "~/lib/offline-store.browser";
import { PAGE_CACHE_NAME } from "~/lib/page-cache";
import { consumeStandaloneLaunch } from "~/lib/standalone-launch.browser";
import { toast } from "~/lib/toast";
import { withStaleVersionRetry } from "~/lib/version-guard.browser";
import { signOut } from "../auth/logout.functions";
import { Lists } from "./components";
import { createList, getLaunchTarget, reorderLists, setDefaultList } from "./home.functions";
import * as styles from "./home.css";
import { type ListItem, zCreate } from "./home.schema";
import {
  cacheHome,
  loadHome,
  offlineLaunchSlug,
  queueCreate,
  queueReorder,
  replayQueue,
} from "./offline";

// Not yet ported (see legacy/README.md): the sign-ups count (stage 4).
export const Route = createFileRoute("/_app/_home")({
  // An installed app opens `/?launch` (the manifest's start_url): send it to
  // the starred list, or plain home. Dropping the param means a later
  // refetch of home can't re-trigger it.
  beforeLoad: async ({ location }) => {
    if (!new URLSearchParams(location.searchStr).has(LAUNCH_PARAM)) return;

    let slug: string | null;
    if (!isServer && !navigator.onLine) {
      slug = await offlineLaunchSlug();
    } else {
      try {
        ({ slug } = await getLaunchTarget());
      } catch (error) {
        if (isRedirect(error) || isServer || !isNetworkOrServerError(error)) throw error;
        slug = await offlineLaunchSlug();
      }
    }

    throw slug
      ? redirect({ to: "/lists/$list", params: { list: slug }, replace: true })
      : redirect({ to: "/", replace: true });
  },
  loader: () => loadHome(),
  head: () => ({
    meta: [
      { title: "Home | Shorpin" },
      { name: "description", content: "We got lists, they’re multiplying" },
    ],
  }),
  staticData: { breadcrumb: { label: "Home" } },
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  const router = useRouter();

  // What's on screen: the loader's lists, plus local changes (a reorder, a
  // list created offline) until the loader next delivers.
  const [lists, setLists] = createSignal<ListItem[]>(() => data().lists);
  const [defaultListId, setDefaultListId] = createSignal(() => data().defaultListId);

  // Effects only run in the browser: cache what the server sent, including
  // on the first page load (React Router's `clientLoader.hydrate`).
  createEffect(data, ({ fromCache, ...fresh }) => {
    if (!fromCache) void cacheHome(fresh);
  });

  onSettled(() => {
    // Installed iOS apps ignore the manifest's start_url and open plain `/`.
    // They're only recognisable in the browser, and the first page load ran
    // beforeLoad on the server, so check here.
    const url = new URL(window.location.href);
    if (consumeStandaloneLaunch(url) && readDefaultListId(document.cookie)) {
      void router.navigate({ href: `/?${LAUNCH_PARAM}`, replace: true });
    }
  });

  // ---- Offline queue ------------------------------------------------------

  async function syncPendingQueue() {
    const outcome = await replayQueue();
    if (outcome === "nothing") return;
    if (outcome === "done") {
      await router.invalidate();
      return;
    }
    // A stale session: the rest stays queued and replays once the user's
    // back, from the mount-time retry below.
    if (typeof outcome === "object") {
      await router.navigate(router.resolveRedirect(outcome.redirect as never).options);
    }
  }

  async function syncIfPending() {
    // Announced before replaying, so a quick replay can't beat the toast.
    if ((await listQueuedMutations("home")).length === 0) return;
    toast.success("Back online - syncing changes");
    await syncPendingQueue();
  }

  useIsOnline({ onOnline: () => void syncIfPending() });

  // Also on mount: retries a queue left behind by a stale-session redirect
  // mid-sync, where no further online/offline transition happens once the
  // user signs back in.
  onSettled(() => {
    if (navigator.onLine) void syncIfPending();
  });

  // ---- Actions --------------------------------------------------------------

  /** Follows a server function's redirect, e.g. a stale session to /login. */
  async function followRedirect(error: unknown) {
    if (!isRedirect(error)) return false;
    await router.navigate(router.resolveRedirect(error).options);
    return true;
  }

  const form = createForm({ schema: zCreate, validate: "blur", revalidate: "input" });
  const [isAdding, setIsAdding] = createSignal(false);

  async function create(input: { "new-list": string }) {
    const name = input["new-list"];

    if (!navigator.onLine) {
      const pending = await queueCreate(name, data().userId);
      setLists((current) => [pending, ...current]);
      toast.info("You're offline - list will be created when back online");
      // Offline there's no server-confirmed slug to move into yet: stay on
      // home, where the pending row stands in.
      reset(form);
      return;
    }

    setIsAdding(true);
    try {
      const result = await withStaleVersionRetry(() => createList({ data: input }));
      if (!result.ok) {
        setErrors(form, { errors: [result.formError] });
        return;
      }
      toast.success(`List "${result.name}" created successfully!`);
      await router.navigate({ to: "/lists/$list", params: { list: result.slug } });
    } catch (error) {
      if (await followRedirect(error)) return;
      setErrors(form, { errors: ["Failed to create list. Please try again."] });
    } finally {
      setIsAdding(false);
    }
  }

  async function reorder(order: string[]) {
    const byId = new Map(lists().map((list) => [list.id, list]));
    setLists(order.flatMap((id) => byId.get(id) ?? []));

    if (!navigator.onLine) {
      await queueReorder(order);
      return;
    }
    try {
      await reorderLists({ data: { order } });
    } catch (error) {
      if (await followRedirect(error)) return;
      if (isNetworkOrServerError(error)) {
        await queueReorder(order);
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to save the order");
    }
  }

  async function toggleDefault(id: string) {
    const next = defaultListId() === id ? null : id;
    setDefaultListId(next);

    if (!navigator.onLine) {
      // Nothing to queue: the cookie is device-local state, so write it
      // directly. The next online launch re-issues it server-side.
      document.cookie = serializeDefaultListCookie(next);
      return;
    }
    await setDefaultList({ data: { listId: next } });
  }

  async function handleSignOut() {
    // Shared-device protection: drop this account's offline data first.
    await clearAllOfflineData();
    await caches.delete(PAGE_CACHE_NAME);
    await signOut().catch(followRedirect);
    // React Router flashed this through a cookie with the redirect. The page
    // that asked for the sign-out can just say so once it's done.
    toast.success("You have been logged out.");
  }

  return (
    <>
      <PageHeader
        actions={[
          <Button onClick={handleSignOut}>
            <PowerIcon />
            <ActionLabel>Sign out</ActionLabel>
          </Button>,
        ]}
      />
      <ScrollArea>
        <nav class={styles.listWrapper}>
          <Lists
            lists={lists()}
            userId={data().userId}
            defaultListId={defaultListId()}
            onToggleDefault={(id) => void toggleDefault(id)}
            onReorder={(order) => void reorder(order)}
          />
        </nav>
      </ScrollArea>

      <Actions>
        <div class={styles.actions}>
          <Form of={form} class={styles.addListForm} onSubmit={create}>
            <Show when={form.errors}>
              {(errors) => (
                <For each={errors()}>{(error) => <p class={styles.formError}>{error}</p>}</For>
              )}
            </Show>
            <div class={styles.newList}>
              <Field of={form} path={["new-list"]}>
                {(field) => (
                  <>
                    <VisuallyHidden>
                      <label for="new-list">New list</label>
                    </VisuallyHidden>
                    <input
                      {...field.props}
                      id="new-list"
                      value={field.input ?? ""}
                      autocomplete="off"
                      class={styles.newListInput}
                    />
                  </>
                )}
              </Field>
              <Button type="submit" isSubmitting={isAdding()} variant="solid">
                Add
              </Button>
            </div>
          </Form>
          <div class={styles.appearance}>
            <Link variant="outline" to="/style">
              <BrushIcon />
              Style
            </Link>
            <ColorSchemeToggle />
          </div>
        </div>
      </Actions>
      {/* The style and config dialogs (child routes). */}
      <Outlet />
    </>
  );
}
