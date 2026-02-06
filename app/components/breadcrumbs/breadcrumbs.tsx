import { useMatches, useLocation } from "react-router";
import { Link } from "~/components/link/link";
import * as styles from "./breadcrumbs.css";

interface BreadcrumbHandle {
  breadcrumb: {
    label: string | ((data: any) => string);
    to?: string;
  };
}

interface BreadcrumbItem {
  label: string;
  to: string;
}

export function Breadcrumbs() {
  const matches = useMatches();
  const location = useLocation();

  const breadcrumbsFromRoutes: BreadcrumbItem[] = matches
    .filter((match): match is typeof match & { handle: BreadcrumbHandle } =>
      Boolean(match.handle?.breadcrumb),
    )
    .map((match) => {
      const { breadcrumb } = match.handle;
      const label =
        typeof breadcrumb.label === "function"
          ? breadcrumb.label(match.data)
          : breadcrumb.label;

      return {
        label,
        to: breadcrumb.to ?? match.pathname,
      };
    });

  // If we're on the home page, only show "Home" as current page
  const isHomePage = location.pathname === "/";

  const breadcrumbs: BreadcrumbItem[] = isHomePage
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
