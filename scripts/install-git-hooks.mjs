import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gitDir = path.join(root, ".git");
const hooksDir = path.join(gitDir, "hooks");
const sourcePath = path.join(root, ".githooks", "pre-commit");
const targetPath = path.join(hooksDir, "pre-commit");
const marker = "shorpin-managed-hook";

if (!existsSync(gitDir) || !existsSync(sourcePath)) {
  process.exit(0);
}

mkdirSync(hooksDir, { recursive: true });

if (existsSync(targetPath)) {
  const existing = readFileSync(targetPath, "utf8");
  if (!existing.includes(marker)) {
    console.warn("[prepare] Existing .git/hooks/pre-commit left unchanged.");
    process.exit(0);
  }
}

writeFileSync(targetPath, readFileSync(sourcePath, "utf8"));
chmodSync(targetPath, 0o755);
