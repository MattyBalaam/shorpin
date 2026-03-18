import { execSync } from "node:child_process";

export async function loader() {
  const hash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  const shortHash = hash.slice(0, 7);
  const date = execSync("git log -1 --format=%ci", {
    encoding: "utf-8",
  }).trim();

  return Response.json({
    hash,
    shortHash,
    date,
  });
}
