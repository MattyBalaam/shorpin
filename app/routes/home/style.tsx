import { href } from "react-router";
import { saveStyleOnline, StyleDialog } from "~/components/app-style/style-dialog";
import { useAccountAppStyle } from "~/components/app-style/use-app-style";
import type { Route } from "./+types/style";

export { action } from "./style.server";

export async function clientAction({ serverAction }: Route.ClientActionArgs) {
  return saveStyleOnline(serverAction);
}

export default function AccountStyle() {
  return <StyleDialog title="Style" value={useAccountAppStyle()} urlOnClose={href("/")} />;
}
