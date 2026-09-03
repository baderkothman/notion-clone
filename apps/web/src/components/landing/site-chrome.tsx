import Link from "next/link";

/**
 * Shared header/footer for every public marketing page (`/`, `/about`) — kept as one
 * component pair so the two pages can never visually drift apart. Nav anchors are
 * root-relative (`/#calendar`, not `#calendar`) so they work correctly from `/about`
 * too: Next.js navigates to `/` and then scrolls to the anchor, rather than trying to
 * find a `#calendar` element that doesn't exist on the current page.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/0 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-text text-sm font-semibold text-bg">
            N
          </div>
          <span className="font-display text-[15px] font-semibold text-text">Notion Clone</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-7 text-sm text-text-muted sm:flex">
          <Link href="/#calendar" className="hover:text-text">
            Calendar
          </Link>
          <Link href="/#features" className="hover:text-text">
            Features
          </Link>
          <Link href="/#own-the-stack" className="hover:text-text">
            Self-hosting
          </Link>
          <Link href="/about" className="hover:text-text">
            About
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-hover hover:text-text sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-text hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-14 text-center">
        <h2 className="text-balance font-display text-2xl font-semibold text-text sm:text-3xl">
          Bring up your own workspace.
        </h2>
        <Link
          href="/sign-up"
          className="inline-flex h-10 items-center rounded-md bg-accent px-6 text-sm font-medium text-accent-text hover:opacity-90"
        >
          Get started free
        </Link>
        <p className="font-mono-brand text-xs text-text-faint">next.js · postgresql · docker · self-hosted</p>
        <Link href="/about" className="text-sm text-text-muted hover:text-text">
          About this project
        </Link>
      </div>
    </footer>
  );
}
