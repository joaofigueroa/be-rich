import "server-only";

import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

export async function getSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("UNAUTHENTICATED");
  }
  return session.user;
}
