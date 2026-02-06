import { useFetcher } from "react-router";
import type { Route } from "./+types/cache";
import { Link } from "~/components/link/link";

let myCache: Array<string> = [];

export const loader = async ({ request }: Route.LoaderArgs) => {
  return {
    data: Array.from({ length: 5 }).map(() => crypto.randomUUID().toString()),
  };
};

export const clientLoader = async ({ serverLoader, request }: Route.ClientLoaderArgs) => {
  const data = (await serverLoader()).data;

  const reset = !new URL(request.url).searchParams.get("load-more");

  myCache = reset ? data : [...myCache, ...data];

  return {
    data: myCache,
  };
};

export const clientAction = () => {
  return crypto.randomUUID();
};

export default function Cache({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto",
        gap: "1em",
      }}
    >
      <Link to="/cache">reset</Link>
      <Link to="/cache?load-more=true">Load more</Link>
      <p>{loaderData.data.join(" | ")}</p>
      <fetcher.Form method="POST">
        <h1>{fetcher.data}</h1>
        <button type="submit">poops</button>
      </fetcher.Form>
    </div>
  );
}
