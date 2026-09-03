import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-6 shadow-[var(--color-shadow)]">
      <h1 className="font-display text-lg font-semibold text-text">Sign in</h1>
      <p className="mt-1 text-sm text-text-muted">Welcome back. Enter your details to continue.</p>
      {params.reset ? (
        <p className="mt-4 rounded-md bg-selected px-3 py-2 text-sm text-text">
          Password reset. You can sign in with your new password.
        </p>
      ) : null}
      <div className="mt-5">
        <SignInForm callbackUrl={params.callbackUrl} />
      </div>
      <p className="mt-4 text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
