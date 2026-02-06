import { setToast } from "remix-toast/middleware";
import type { Route } from "./+types/toast-test";
import { Link } from "~/components/link/link";

export const loader = async ({ context }: Route.LoaderArgs) => {
  setToast(context, {
    type: "info",
    message: "This is a toast test",
  });

  return { anything: "you want" };
};

export default function ToastTest({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h1>Toast Test</h1>
      <p>This route sets a toast message.</p>

      <Link to="/">back to home</Link>
    </div>
  );
}
