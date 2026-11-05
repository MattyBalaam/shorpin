import { useLocation, useMatches } from "@tanstack/solid-router";
import { createMemo, For, Show } from "solid-js";
import { Link } from "~/components/link/link";
import { VisuallyHidden } from "../visually-hidden/visually-hidden";
import * as styles from "./breadcrumbs.css";

export interface BreadcrumbDef {
  label: string | ((data: unknown) => string);
  /** Where the crumb links; the route's own path by default. */
  to?: (data: unknown, pathname: string) => string;
}

// Routes declare their crumbs in `staticData` (React Router's `handle`):
// declaration merging types it on every route. A route may add more than one
// (the delete page: its list, then "Delete").
declare module "@tanstack/solid-router" {
  interface StaticDataRouteOption {
    breadcrumb?: BreadcrumbDef | BreadcrumbDef[];
  }
}

// Functions are contravariant in their parameters, so `(data: T) => string`
// isn't directly assignable to `(data: unknown) => string`. The cast is sound
// because the breadcrumb system always passes the matching route's loader data.
export function breadcrumb<TData>(def: {
  label: string | ((data: TData) => string);
  to?: (data: TData, pathname: string) => string;
}) {
  return def as unknown as BreadcrumbDef;
}

// Data only, with the markup in the JSX below. In Solid, JSX built inside a
// derived function is built again on every read, and outside the render tree
// it can't be matched to the server's HTML when hydrating.
interface BreadcrumbItem {
  label: string;
  to: string;
  isBack?: boolean;
}

export function Breadcrumbs() {
  const matches = useMatches();
  const location = useLocation();

  const breadcrumbs = createMemo((): BreadcrumbItem[] => {
    const fromRoutes = matches().flatMap((match) =>
      [match.staticData.breadcrumb ?? []].flat().map((def) => ({
        label: typeof def.label === "function" ? def.label(match.loaderData) : def.label,
        to: def.to?.(match.loaderData, match.pathname) ?? match.pathname,
      })),
    );

    // If we're on the home page, only show "Home" as current page
    if (location().pathname === "/") return fromRoutes;

    return [
      { label: "Back to index", to: "/", isBack: true },
      ...fromRoutes.filter((crumb) => crumb.to !== "/"),
    ];
  });

  return (
    <Show when={breadcrumbs().length > 0}>
      <nav aria-label="Breadcrumbs" class={styles.nav}>
        <ol class={styles.list}>
          <For each={breadcrumbs()}>
            {(crumb, index) => {
              const isLast = () => index() === breadcrumbs().length - 1;
              // The back crumb shows as an arrow, wherever it falls: a
              // route with no crumb of its own (a dialog over home) leaves
              // it last.
              const label = () => (
                <Show when={crumb.isBack} fallback={crumb.label}>
                  <VisuallyHidden>{crumb.label}</VisuallyHidden>
                  <span aria-hidden="true">&#10229;</span>
                </Show>
              );
              return (
                <li class={isLast() ? styles.currentItem : styles.item}>
                  <Show
                    when={isLast()}
                    fallback={
                      <Link variant="primary" to={crumb.to} class={styles.link}>
                        {label()}
                      </Link>
                    }
                  >
                    <h1 class={styles.currentPage} aria-current="page">
                      {label()}
                    </h1>
                  </Show>
                </li>
              );
            }}
          </For>
        </ol>
      </nav>
    </Show>
  );
}
