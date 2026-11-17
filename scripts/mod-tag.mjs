#!/usr/bin/env node
// Creates and pushes the next mod tag for this fork.
// Tags follow v2.1.1.<n>, where <n> grows with every change we ship.
// Usage: pnpm mod:tag -- [-m "message"] [--dry-run] [--no-push] [--allow-dirty]

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_VERSION = "2.1.1";
const TAG_PREFIX = `v${BASE_VERSION}.`;
const TAG_PATTERN = /^v2\.1\.1\.(\d+)$/;
const REMOTE = "origin";

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (allowFailure) return null;
    const stderr = error.stderr?.toString().trim();
    console.error(`git ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`Usage: pnpm mod:tag -- [options]

Creates the next ${TAG_PREFIX}<n> tag on HEAD and pushes it to ${REMOTE}.

Options:
  -m, --message <text>  Annotation message (default: "WFHelper Fell Mod <tag>")
      --dry-run         Print the tag that would be created, do nothing
      --no-push         Create the tag locally, skip the push
      --allow-dirty     Allow tagging with uncommitted changes
  -h, --help            Show this help`);
}

let message = "";
let dryRun = false;
let shouldPush = true;
let allowDirty = false;

const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "-m" || arg === "--message") {
    message = args[index + 1] ?? "";
    index += 1;
  } else if (arg === "--dry-run") {
    dryRun = true;
  } else if (arg === "--no-push") {
    shouldPush = false;
  } else if (arg === "--allow-dirty") {
    allowDirty = true;
  } else if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  } else {
    console.error(`Unknown option: ${arg}`);
    printHelp();
    process.exit(1);
  }
}

const dirty = git(["status", "--porcelain"]);
if (dirty && !allowDirty) {
  console.error("Working tree has uncommitted changes. Commit them first or pass --allow-dirty.");
  process.exit(1);
}

const localTags = git(["tag", "--list", `${TAG_PREFIX}*`])
  .split("\n")
  .filter(Boolean);
const remoteTags = git(["ls-remote", "--tags", REMOTE])
  .split("\n")
  .filter(Boolean)
  .map((line) => line.split("\t")[1])
  .filter((ref) => ref && !ref.endsWith("^{}"))
  .map((ref) => ref.replace(/^refs\/tags\//, ""))
  .filter((tag) => tag.startsWith(TAG_PREFIX));

const numbers = [...new Set([...localTags, ...remoteTags])]
  .map((tag) => TAG_PATTERN.exec(tag))
  .filter(Boolean)
  .map((match) => Number(match[1]));

const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
const tag = `${TAG_PREFIX}${next}`;
const annotation = message || `WFHelper Fell Mod ${tag}`;

if (dryRun) {
  console.log(
    `Would create tag ${tag} on ${git(["rev-parse", "--short", "HEAD"])} (${annotation}).`,
  );
  process.exit(0);
}

git(["tag", "-a", tag, "-m", annotation]);
console.log(`Created tag ${tag} (${annotation}).`);

if (shouldPush) {
  git(["push", REMOTE, `refs/tags/${tag}`]);
  console.log(`Pushed ${tag} to ${REMOTE}.`);
} else {
  console.log(`Skipped push. Run: git push ${REMOTE} refs/tags/${tag}`);
}
