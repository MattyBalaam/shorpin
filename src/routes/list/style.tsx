import { createFileRoute, useLoaderData, useRouter } from "@tanstack/solid-router";
import { StyleDialog } from "~/components/app-style/style-dialog";
import { useAccountAppStyle } from "~/components/app-style/use-app-style";
import { INHERIT_APP_STYLE, isAppStyle } from "~/lib/app-style";
import { saveListStyle } from "./style.functions";

export const Route = createFileRoute("/_app/lists/$list/style")({
  component: ListStyle,
});

function ListStyle() {
  const router = useRouter();
  const params = Route.useParams();
  const list = useLoaderData({ from: "/_app/lists/$list" });
  const accountStyle = useAccountAppStyle();

  async function save(style: string) {
    if (style !== INHERIT_APP_STYLE && !isAppStyle(style)) return;
    const slug = params().list;
    const { error } = await saveListStyle({ data: { slug, style } });
    if (error) return error;
    // The list's loader returns the new appStyleOverride.
    await router.navigate({ to: "/lists/$list", params: { list: slug } });
    await router.invalidate();
  }

  return (
    <StyleDialog
      title="List style"
      value={list().appStyleOverride}
      inherit={accountStyle()}
      urlOnClose={`/lists/${params().list}`}
      onSave={save}
    />
  );
}
