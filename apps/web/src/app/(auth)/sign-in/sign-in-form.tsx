"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@notion-clone/ui";
import { signInAction, type ActionState } from "../actions";

export function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signInAction, {});

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-xs text-text-muted hover:text-accent hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" className="w-full justify-center" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
