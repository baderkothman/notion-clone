"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@notion-clone/ui";
import { acceptInvitationAction } from "@/app/(app)/actions/workspaces";

export function AcceptInvitationCard({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvitationAction(token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.value.workspaceSlug) {
        router.push(`/w/${result.value.workspaceSlug}`);
      } else {
        router.push("/");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="primary" className="w-full justify-center" onClick={onAccept} disabled={pending}>
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
