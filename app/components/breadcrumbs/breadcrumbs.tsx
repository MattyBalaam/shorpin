import { useMatches, useLocation } from "react-router";
import { Link } from "~/components/link/link";
import * as styles from "./breadcrumbs.css";

interface BreadcrumbDef {
  label: string | ((data: any) => string);
  to?: string | ((data: any, pathname: string) => string);
}

interface BreadcrumbItem {
  label: string;
  to: string;
}

function resolveBreadcrumb(def: BreadcrumbDef, data: any, pathname: string) {
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
      const handle = match.handle as { breadcrumb?: BreadcrumbDef; breadcrumbs?: BreadcrumbDef[] };

      if (handle.breadcrumbs) {
        return handle.breadcrumbs.map((def) =>
          resolveBreadcrumb(def, match.data, match.pathname),
        );
      }

      return resolveBreadcrumb(handle.breadcrumb!, match.data, match.pathname);
    });

  // If we're on the home page, only show "Home" as current page
  const isHomePage = location.pathname === "/";

  const breadcrumbs = isHomePage
    ? breadcrumbsFromRoutes
    : [
        { label: "Lists", to: "/" },
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
                <>
                  <Link to={crumb.to} className={styles.link}>
                    {crumb.label}
                  </Link>
                  <span className={styles.separator} aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
