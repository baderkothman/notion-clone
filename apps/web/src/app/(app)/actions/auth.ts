"use server";

import { signOut } from "@notion-clone/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" });
}
