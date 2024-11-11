import { Form } from "react-router";

export { action } from "./delete.server";

export default function Delete() {
	return (
		<Form method="POST">
			<h1>Are you sure you want to delete?</h1>

			<button type="submit" style={{ color: "red" }}>
				Yes
			</button>
		</Form>
	);
}
