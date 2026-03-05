import type { ReactNode } from "react";
import { useMatches, useLocation } from "react-router";
import { Link } from "~/components/link/link";
import * as styles from "./breadcrumbs.css";
import { VisuallyHidden } from "../visually-hidden/visually-hidden";

export interface BreadcrumbDef {
  label: ReactNode | ((data: unknown) => ReactNode);
  to?: string | ((data: unknown, pathname: string) => string);
}

// Helper for route handles to declare typed breadcrumb callbacks.
// Functions are contravariant in their parameters, so `(data: T) => ReactNode`
// isn't directly assignable to `(data: unknown) => ReactNode`. The cast is sound
// because the breadcrumb system always passes the matching route's loader data.
export function breadcrumb<TData>(def: {
  label: ReactNode | ((data: TData) => ReactNode);
  to?: string | ((data: TData, pathname: string) => string);
}): BreadcrumbDef {
  return def as unknown as BreadcrumbDef;
}

interface BreadcrumbItem {
  label: ReactNode;
  to: string;
}

function resolveBreadcrumb(def: BreadcrumbDef, data: unknown, pathname: string) {
  return {
    label: typeof def.label === "function" ? def.label(data) : def.label,
    to: typeof def.to === "function" ? def.to(data, pathname) : (def.to ?? pathname),
  } satisfies BreadcrumbItem;
}

export function Breadcrumbs() {
  const matches = useMatches();
  const location = useLocation();

  const breadcrumbsFromRoutes = matches
    .filter((match) => {
      const handle = match.handle as Record<string, unknown> | undefined;
      return Boolean(handle?.breadcrumb || handle?.breadcrumbs);
    })
    .flatMap((match) => {
      const handle = match.handle as {
        breadcrumb?: BreadcrumbDef;
        breadcrumbs?: BreadcrumbDef[];
      };

      if (handle.breadcrumbs) {
        return handle.breadcrumbs.map((def) =>
          resolveBreadcrumb(def, match.loaderData, match.pathname),
        );
      }

      if (!handle.breadcrumb) return [];
      return resolveBreadcrumb(handle.breadcrumb, match.loaderData, match.pathname);
    });

  // If we're on the home page, only show "Home" as current page
  const isHomePage = location.pathname === "/";

  const breadcrumbs = isHomePage
    ? breadcrumbsFromRoutes
    : [
        {
          label: (
            <>
              <VisuallyHidden>Back to index</VisuallyHidden>
              <span aria-hidden>&#10229;</span>
            </>
          ),
          to: "/",
        },
        ...breadcrumbsFromRoutes.filter((crumb) => crumb.to !== "/"),
      ];

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumbs" className={styles.nav}>
      <ol className={styles.list}>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={crumb.to} className={styles.item}>
              {isLast ? (
                <h1 className={styles.currentPage} aria-current="page">
                  {crumb.label}
                </h1>
              ) : (
                <Link variant="primary" to={crumb.to} className={styles.link}>
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
