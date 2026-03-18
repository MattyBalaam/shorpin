export async function loader() {
  const hash = import.meta.env.VITE_GIT_HASH ?? "unknown";
  const pr = import.meta.env.VITE_PR_NUMBER;

  return Response.json({
    hash,
    shortHash: hash.slice(0, 7),
    date: import.meta.env.VITE_GIT_DATE ?? "unknown",
    pr: pr ? `https://github.com/MattyBalaam/shorpin/pull/${pr}` : null,
  });
}
