import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, `.env.${process.env.NODE_ENV ?? "development"}`), override: true });
config({ path: resolve(root, ".env.local"), override: true });
config({
  path: resolve(root, `.env.${process.env.NODE_ENV ?? "development"}.local`),
  override: true,
});

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/be_rich",
  },
  casing: "snake_case",
  strict: true,
});
