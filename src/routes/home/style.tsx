import { createFileRoute, useRouter } from "@tanstack/solid-router";
import { StyleDialog } from "~/components/app-style/style-dialog";
import { useAccountAppStyle } from "~/components/app-style/use-app-style";
import { isAppStyle } from "~/lib/app-style";
import { saveAccountStyle } from "./style.functions";

export const Route = createFileRoute("/_app/_home/style")({
  head: () => ({ meta: [{ title: "Style | Shorpin" }] }),
  component: AccountStyle,
});

function AccountStyle() {
  const router = useRouter();
  const accountStyle = useAccountAppStyle();

  async function save(style: string) {
    if (!isAppStyle(style)) return;
    const { error } = await saveAccountStyle({ data: { style } });
    if (error) return error;
    // The root loader picks up the new cookie, and home re-reads the profile.
    await router.navigate({ to: "/" });
    await router.invalidate();
  }

  return <StyleDialog title="Style" value={accountStyle()} urlOnClose="/" onSave={save} />;
}
