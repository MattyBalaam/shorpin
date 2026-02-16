import { Form, useLocation, useNavigate, useNavigation } from "react-router";
import { Link } from "~/components/link/link";
import type { Route } from "./+types/delete";
import * as styles from "./delete.css";
import { Button } from "~/components/button/button";

export { action } from "./delete.server";

export const handle = {
  breadcrumb: {
    label: "Delete",
  },
};

export default function Delete() {
  const location = useLocation();
  const from = location.state?.from;

  return (
    <Form method="POST">
      <h1>Are you sure you want to delete?</h1>

      <Button type="submit" className={styles.deleteButton}>
        Yes
      </Button>

      {from || "nope"}

      {/* <Link variant="outline" to={navigation.state}
				No
			</Button> */}
    </Form>
  );
}
