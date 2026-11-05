import { isServer } from "@solidjs/web";
import {
  createFileRoute,
  isRedirect,
  redirect,
  useCanGoBack,
  useRouter,
} from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { breadcrumb } from "~/components/breadcrumbs/breadcrumbs";
import { Button } from "~/components/button/button";
import * as errorStateStyles from "~/components/error-state/error-state.css";
import { Link } from "~/components/link/link";
import { PageHeader } from "~/components/page-header/page-header";
import { isNetworkOrServerError } from "~/lib/network-error";
import { toast } from "~/lib/toast";
import { withStaleVersionRetry } from "~/lib/version-guard.client";
import { deleteList, getDeleteTarget } from "./delete.functions";
import * as styles from "./delete.css";

type DeleteLoaderData = { listName: string } | undefined;

export const Route = createFileRoute("/_app/lists/$list/confirm-delete")({
  loader: async ({ params }) => {
    const target = await getDeleteTarget({ data: { slug: params.list } });
    if (!target.ok) {
      // Toasts live in the browser. A server-rendered request just lands
      // on home.
      if (!isServer) toast.error(target.error);
      throw redirect({ to: "/" });
    }
    return target;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Delete ${loaderData.listName} | Shorpin` : "Delete list | Shorpin" },
    ],
  }),
  staticData: {
    breadcrumb: [
      breadcrumb<DeleteLoaderData>({
        label: (data) => data?.listName ?? "List",
        to: (_data, pathname) => pathname.replace(/\/confirm-delete$/, ""),
      }),
      { label: "Delete" },
    ],
  },
  notFoundComponent: () => (
    <div class={errorStateStyles.errorState}>
      <p>List does not exist</p>
      <Link to="/">Back to home</Link>
    </div>
  ),
  component: Delete,
});

function Delete() {
  const data = Route.useLoaderData();
  const params = Route.useParams();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const [isDeleting, setIsDeleting] = createSignal(false);

  async function confirm(event: SubmitEvent) {
    event.preventDefault();
    setIsDeleting(true);
    try {
      const result = await withStaleVersionRetry(() =>
        deleteList({ data: { slug: params().list } }),
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`List ${data().listName} deleted successfully`);
      await router.navigate({ to: "/" });
    } catch (error) {
      if (isRedirect(error)) {
        await router.navigate(router.resolveRedirect(error).options);
        return;
      }
      toast.error(
        isNetworkOrServerError(error)
          ? "You're offline - connect to delete the list"
          : "Failed to delete list. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <PageHeader />
      <form class={styles.form} onSubmit={confirm}>
        <h1>Delete?</h1>

        <p>Are you sure?</p>

        <div class={styles.actions}>
          <Button variant="destructive" type="submit" isSubmitting={isDeleting()}>
            Yes
          </Button>

          {/* Back where the user came from (usually the config dialog),
              else home. React Router read the Referer, which client
              navigations don't update. */}
          <Link
            variant="outline"
            to="/"
            onClick={(event: MouseEvent) => {
              if (!canGoBack()) return;
              event.preventDefault();
              router.history.back();
            }}
          >
            I do not
          </Link>
        </div>
      </form>
    </>
  );
}
