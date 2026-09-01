import NextAuth from "next-auth";
import { edgeAuthConfig } from "./edge-config";
import "./types";

/** Edge-safe `auth()` for middleware only — see edge-config.ts. Everything else
 * (sign-in, sign-up, route handlers, server components) uses the default export
 * (`@notion-clone/auth`), which has the real Credentials provider. */
export const { auth } = NextAuth(edgeAuthConfig);
