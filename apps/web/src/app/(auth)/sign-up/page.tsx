import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-6 shadow-[var(--color-shadow)]">
      <h1 className="text-lg font-semibold text-text">Create your account</h1>
      <p className="mt-1 text-sm text-text-muted">Free to start. No credit card required.</p>
      <div className="mt-5">
        <SignUpForm callbackUrl={params.callbackUrl} />
      </div>
      <p className="mt-4 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
