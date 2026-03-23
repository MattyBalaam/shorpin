import { Form, useNavigation } from "react-router";
import { breadcrumb } from "~/components/breadcrumbs/breadcrumbs";
import { Button } from "~/components/button/button";
import { Link } from "~/components/link/link";
import type { Route } from "./+types/delete";
import * as styles from "./delete.css";

export { action, loader } from "./delete.server";

export const handle = {
  breadcrumbs: [
    breadcrumb<Route.ComponentProps["loaderData"]>({
      label: (data) => data?.listName ?? "List",
      to: (_data, pathname) => pathname.replace("/confirm-delete", ""),
    }),
    { label: "Delete" },
  ],
};

export const meta: Route.MetaFunction = ({ data }) => {
  const listName = data?.listName;
  return [
    {
      title: listName ? `Delete ${listName} | Shorpin` : "Delete list | Shorpin",
    },
  ];
};

export default function Delete({ loaderData }: Route.ComponentProps) {
  return (
    <Form method="POST" className={styles.form}>
      <h1>Delete?</h1>

      <p>Are you sure?</p>

      <div className={styles.actions}>
        <Button variant="destructive" type="submit">
          Yes
        </Button>

        <Link variant="outline" to={loaderData.returnTo}>
          I do not
        </Link>
      </div>

      {loaderData.returnTo}
    </Form>
  );
}
