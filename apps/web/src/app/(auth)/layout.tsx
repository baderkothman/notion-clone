import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4">
      {/* Same signature texture as the landing hero's terminal, at a whisper — a
          fixed dot grid, not another animation. The boldness was spent once. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border-strong)_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
      />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-text text-sm font-semibold text-bg">
            N
          </div>
          <span className="font-display text-sm font-semibold text-text">Notion Clone</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
