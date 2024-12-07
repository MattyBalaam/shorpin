import { Form } from "react-router";
import { Button } from "~/components/button/button";

export { action } from "./delete.server";

export default function Delete() {
	return (
		<Form method="POST">
			<h1>Are you sure you want to delete?</h1>

			<Button type="submit" style={{ color: "red" }}>
				Yes
			</Button>
		</Form>
	);
}
