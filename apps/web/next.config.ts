import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: { root },
  serverExternalPackages: ["@react-pdf/renderer", "exceljs", "unpdf"],
};

export default withWorkflow(nextConfig);
