"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { signIn } from "@notion-clone/auth";
import { signUpUser } from "@/server/auth/sign-up";
import { requestPasswordReset, resetPassword } from "@/server/auth/password-reset";
import { DomainError } from "@notion-clone/shared";
import { AuthError } from "next-auth";

export interface ActionState {
  error?: string;
}

/** Turns any thrown error into a message worth showing the user. Zod validation
 * failures (e.g. "Password must be at least 10 characters") are surfaced directly
 * instead of falling back to a generic message — the browser's own HTML validation
 * (required/minLength/type=email) catches most bad input before submission, but
 * anything that reaches the server (autofill, non-standard clients, a validation rule
 * HTML can't express) needs its rejection explained, not swallowed into "check your
 * details and try again". */
function messageFor(error: unknown): string {
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Please check your details and try again.";
  if (error instanceof DomainError) return error.message;
  return "Something went wrong. Please try again.";
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signUpUser({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  } catch (error) {
    return { error: messageFor(error) };
  }

  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: String(formData.get("callbackUrl") ?? "/"),
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Account created — please sign in." };
    throw error;
  }
  return {};
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: String(formData.get("callbackUrl") ?? "/"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Incorrect email or password." };
    }
    throw error;
  }
  return {};
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requestPasswordReset({ email: String(formData.get("email") ?? "") });
  } catch (error) {
    return { error: messageFor(error) };
  }
  redirect("/forgot-password?sent=1");
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await resetPassword({
      token: String(formData.get("token") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  } catch (error) {
    return { error: messageFor(error) };
  }
  redirect("/sign-in?reset=1");
}
