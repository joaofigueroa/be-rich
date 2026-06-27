import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");
loadEnvConfig(root, process.env.NODE_ENV !== "production");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: { root },
  serverExternalPackages: ["@react-pdf/renderer", "exceljs", "unpdf"],
};

export default withWorkflow(nextConfig);
