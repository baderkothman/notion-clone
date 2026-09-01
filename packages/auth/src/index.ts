import NextAuth from "next-auth";
import { authConfig } from "./config";
import "./types";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
export * from "./password";
