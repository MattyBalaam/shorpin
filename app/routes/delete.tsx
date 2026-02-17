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
      to: (_data: any, pathname: string) =>
        pathname.replace("/confirm-delete", ""),
    },
    {
      label: "Delete",
    },
  ],
};

export default function Delete(_args: Route.ComponentProps) {
  const location = useLocation();
  const from = location.state?.from;

  return (
    <Form method="POST">
      <h1>Are you sure you want to delete?</h1>

      <Button type="submit" className={styles.deleteButton}>
        Yes
      </Button>

      <Link variant="button" to={from || href("/")}>
        I do not
      </Link>
    </Form>
  );
}
