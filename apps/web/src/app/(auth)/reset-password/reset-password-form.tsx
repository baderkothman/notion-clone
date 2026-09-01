"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@notion-clone/ui";
import { resetPasswordAction, type ActionState } from "../actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          autoFocus
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" className="w-full justify-center" disabled={pending}>
        {pending ? "Saving…" : "Reset password"}
      </Button>
    </form>
  );
}
