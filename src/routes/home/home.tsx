import { createFileRoute } from "@tanstack/solid-router";
import { useServerFn } from "@tanstack/solid-start";
import { Actions } from "~/components/actions/actions";
import { Button } from "~/components/button/button";
import { PowerIcon } from "~/components/icon/icons";
import { ActionLabel, PageHeader } from "~/components/page-header/page-header";
import { ScrollArea } from "~/components/scroll-area/scroll-area";
import { clearAllOfflineData } from "~/lib/offline-store.client";
import { PAGE_CACHE_NAME } from "~/lib/page-cache";
import { toast } from "~/lib/toast";
import { signOut } from "../auth/logout.functions";
import { Lists } from "./components";
import { getHome } from "./home.functions";
import * as styles from "./home.css";

// Not yet ported (see legacy/README.md): the offline cache and queued
// replays, creating lists, the sign-ups count and the style/colour controls.
export const Route = createFileRoute("/_app/")({
  loader: () => getHome(),
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
  const signOutFn = useServerFn(signOut);

  async function handleSignOut() {
    // Shared-device protection: drop this account's offline data first.
    await clearAllOfflineData();
    await caches.delete(PAGE_CACHE_NAME);
    await signOutFn();
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
          <Lists lists={data().lists} />
        </nav>
      </ScrollArea>
      <Actions>
        <div class={styles.actions} />
      </Actions>
    </>
  );
}
