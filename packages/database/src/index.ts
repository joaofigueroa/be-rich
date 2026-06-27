import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to access the database");
  }
  return drizzle(neon(url), { casing: "snake_case", schema });
}

let database: ReturnType<typeof createDatabase> | null = null;

export function getDb() {
  database ??= createDatabase();
  return database;
}

export { schema };
export * from "drizzle-orm";
export * from "./schema";
