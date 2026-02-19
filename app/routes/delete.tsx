import {
  Form,
  href,
  useLocation,
  useNavigate,
  useNavigation,
} from "react-router";
import { Link } from "~/components/link/link";
import type { Route } from "./+types/delete";
import * as styles from "./delete.css";
import { Button } from "~/components/button/button";

export { action, loader } from "./delete.server";

export const handle = {
  breadcrumbs: [
    {
      label: (data: any) => data?.listName || "List",
      to: (_data: unknown, pathname: string) =>
        pathname.replace("/confirm-delete", ""),
    },
    {
      label: "Delete",
    },
  ],
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
