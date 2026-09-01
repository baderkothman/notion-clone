import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-6 shadow-[var(--color-shadow)]">
      <h1 className="text-lg font-semibold text-text">Set a new password</h1>
      {params.token ? (
        <div className="mt-5">
          <ResetPasswordForm token={params.token} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-destructive">This reset link is missing its token.</p>
      )}
    </div>
  );
}
