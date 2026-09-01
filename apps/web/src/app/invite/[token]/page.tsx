import Link from "next/link";
import { auth } from "@notion-clone/auth";
import { getInvitationPreview } from "@/server/workspaces/members";
import { EmptyState } from "@notion-clone/ui";
import { MailX } from "lucide-react";
import { AcceptInvitationCard } from "./accept-invitation-card";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [session, invitation] = await Promise.all([auth(), getInvitationPreview(token)]);

  if (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <EmptyState
          icon={<MailX className="h-8 w-8" />}
          title="This invitation isn't valid"
          description="It may have expired, already been used, or been revoked. Ask the workspace owner to send a new one."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface-raised p-6 text-center shadow-[var(--color-shadow)]">
        <h1 className="text-lg font-semibold text-text">Join {invitation.workspaceName}</h1>
        <p className="mt-1 text-sm text-text-muted">
          You&apos;ve been invited as a{" "}
          <span className="font-medium text-text">{invitation.role}</span> — invitation sent to{" "}
          {invitation.email}.
        </p>

        {session?.user ? (
          session.user.email?.toLowerCase() === invitation.email ? (
            <div className="mt-5">
              <AcceptInvitationCard token={token} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-destructive">
              You&apos;re signed in as {session.user.email}, but this invitation was sent to{" "}
              {invitation.email}. Sign out and sign in with that email to accept it.
            </p>
          )
        ) : (
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href={`/sign-in?callbackUrl=/invite/${token}`}
              className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-text hover:opacity-90"
            >
              Sign in to accept
            </Link>
            <Link
              href={`/sign-up?callbackUrl=/invite/${token}`}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text hover:bg-hover"
            >
              Create an account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
