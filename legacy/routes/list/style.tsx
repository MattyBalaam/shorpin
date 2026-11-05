import { href } from "react-router";
import { saveStyleOnline, StyleDialog } from "~/components/app-style/style-dialog";
import { useAccountAppStyle } from "~/components/app-style/use-app-style";
import { isAppStyle } from "~/lib/app-style";
import type { Route } from "./+types/style";

export { action } from "./style.server";

export async function clientAction({ serverAction }: Route.ClientActionArgs) {
  return saveStyleOnline(serverAction);
}

export default function ListStyle({ matches, params: { list } }: Route.ComponentProps) {
  const { appStyleOverride } = matches[2].loaderData;

  return (
    <StyleDialog
      title="List style"
      value={isAppStyle(appStyleOverride) ? appStyleOverride : null}
      inherit={useAccountAppStyle()}
      urlOnClose={href("/lists/:list", { list })}
    />
  );
}
