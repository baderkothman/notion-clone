import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-6 shadow-[var(--color-shadow)]">
      <h1 className="font-display text-lg font-semibold text-text">Reset your password</h1>
      <p className="mt-1 text-sm text-text-muted">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      {params.sent ? (
        <p className="mt-4 rounded-md bg-selected px-3 py-2 text-sm text-text">
          If an account exists for that email, a reset link is on its way.
        </p>
      ) : (
        <div className="mt-5">
          <ForgotPasswordForm />
        </div>
      )}
    </div>
  );
}
