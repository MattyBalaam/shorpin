export async function loader() {
  return Response.json({
    hash: import.meta.env.VITE_GIT_HASH ?? "unknown",
    shortHash: (import.meta.env.VITE_GIT_HASH ?? "unknown").slice(0, 7),
    date: import.meta.env.VITE_GIT_DATE ?? "unknown",
  });
}
