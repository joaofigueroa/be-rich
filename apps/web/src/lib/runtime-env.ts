import "server-only";

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");

let loaded = false;

function findWorkspaceRoot(start: string) {
  let current = resolve(start);
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(resolve(current, "pnpm-workspace.yaml"))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

export function loadRuntimeEnv() {
  if (loaded) return;
  loaded = true;

  const workspaceRoot = findWorkspaceRoot(process.cwd());
  if (workspaceRoot) loadEnvConfig(workspaceRoot, process.env.NODE_ENV !== "production");
}
