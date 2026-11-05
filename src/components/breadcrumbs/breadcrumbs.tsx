import { useLocation, useMatches } from "@tanstack/solid-router";
import { createMemo, For, Show } from "solid-js";
import { Link } from "~/components/link/link";
import { VisuallyHidden } from "../visually-hidden/visually-hidden";
import * as styles from "./breadcrumbs.css";

export interface BreadcrumbDef {
  label: string | ((data: unknown) => string);
}

// Routes declare their crumb in `staticData` (React Router's `handle`):
// declaration merging types it on every route.
declare module "@tanstack/solid-router" {
  interface StaticDataRouteOption {
    breadcrumb?: BreadcrumbDef;
  }
}

// Functions are contravariant in their parameters, so `(data: T) => string`
// isn't directly assignable to `(data: unknown) => string`. The cast is sound
// because the breadcrumb system always passes the matching route's loader data.
export function breadcrumb<TData>(def: { label: string | ((data: TData) => string) }) {
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
    const fromRoutes = matches().flatMap((match) => {
      const def = match.staticData.breadcrumb;
      if (!def) return [];
      return {
        label: typeof def.label === "function" ? def.label(match.loaderData) : def.label,
        to: match.pathname,
      };
    });

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
              return (
                <li class={isLast() ? styles.currentItem : styles.item}>
                  <Show
                    when={isLast()}
                    fallback={
                      <Link variant="primary" to={crumb.to} class={styles.link}>
                        <Show when={crumb.isBack} fallback={crumb.label}>
                          <VisuallyHidden>{crumb.label}</VisuallyHidden>
                          <span aria-hidden="true">&#10229;</span>
                        </Show>
                      </Link>
                    }
                  >
                    <h1 class={styles.currentPage} aria-current="page">
                      {crumb.label}
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
