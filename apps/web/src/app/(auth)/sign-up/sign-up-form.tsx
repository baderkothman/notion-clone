"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@notion-clone/ui";
import { signUpAction, type ActionState } from "../actions";

export function SignUpForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signUpAction, {});

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" autoComplete="name" required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
        <p className="text-xs text-text-faint">At least 10 characters.</p>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" className="w-full justify-center" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
