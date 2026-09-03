import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/landing/site-chrome";

export const metadata: Metadata = {
  title: "About — Notion Clone",
  description: "Why this workspace exists, and how it's different from Notion and hosted alternatives.",
};

export default function AboutPage() {
  return (
    <div className="bg-bg">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 pb-16 pt-16 sm:pt-20">
        <p className="font-mono-brand text-xs text-text-faint">about.md</p>
        <h1 className="mt-3 text-balance font-display text-3xl font-semibold leading-tight text-text sm:text-4xl">
          A workspace that stays out of your way.
        </h1>
        <p className="mt-5 text-pretty text-lg leading-relaxed text-text-muted">
          Notion is the reason products like this one get built at all: it proved that
          notes, docs, and structured data could live in one flexible tool. It also
          proved that flexibility has a cost. This project starts from what Notion got
          right and tries to fix the parts that got heavy along the way.
        </p>
      </section>

      <section className="border-y border-border bg-sidebar">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="font-mono-brand text-xs text-text-faint">the_problem</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-text">
            Powerful enough to feel like work.
          </h2>
          <div className="mt-5 space-y-4 text-text-muted">
            <p>
              People who use Notion for a while tend to describe the same shape of
              frustration, whatever their specific complaint: it&apos;s flexible enough to
              build almost anything, and that same flexibility means building anything
              takes real setup before it&apos;s useful. A new workspace is a blank canvas,
              not a running start.
            </p>
            <p>
              A few gaps show up often enough to be worth naming directly, because they
              shaped what this project chose to build first: there&apos;s no native
              calendar, so scheduling lives in a separate app no matter how much of the
              rest of your work lives in Notion. Large workspaces get visibly slower as
              content grows. Sharing and guest access work, but the permission model
              takes real effort to reason about. And the tool that was supposed to
              replace five other tools quietly becomes one more tab to keep open
              alongside them.
            </p>
            <p>None of that makes Notion bad. It makes it a big tool for a job that&apos;s often small.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <p className="font-mono-brand text-xs text-text-faint">the_approach</p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-text">
          Fewer decisions before the first useful page.
        </h2>
        <div className="mt-5 space-y-4 text-text-muted">
          <p>
            This isn&apos;t a rebuild of Notion feature-for-feature; that would just be a
            slower copy of something that already exists. It keeps what Notion got
            right (a real block editor, nested pages, databases that double as trackers)
            and treats the rest as open questions instead of settled defaults.
          </p>
          <p>
            The clearest answer so far is the calendar: instead of leaving scheduling to
            a separate app, it&apos;s a first-class page in the workspace, syncing both ways
            with Google Calendar. Not a database view repurposed to look like a
            calendar: an actual calendar, with the same month/week/day/agenda views
            you&apos;d expect from a tool built around one.
          </p>
          <p>
            Self-hosting is the other half of the answer. A workspace that holds a
            team&apos;s notes, plans, and now its calendar is worth owning outright, on
            infrastructure you control, with data that never has to leave your network
            unless you decide it should.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-sidebar">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="font-mono-brand text-xs text-text-faint">how_its_built</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-text">Built like infrastructure, not a demo.</h2>
          <div className="mt-5 space-y-4 text-text-muted">
            <p>
            Every action (opening a page, inviting a teammate, connecting a Google
            account) is authorized on the server, every time, regardless of what the
              client claims. Nothing about who can see what is decided by hiding a
              button in the interface.
            </p>
            <p>
            Secrets that need to be stored, including Google&apos;s access and refresh tokens,
            are encrypted at rest, not kept in plain text because it was
              convenient. The codebase is open: read it, change it, run it on your own
              terms.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="text-balance font-display text-2xl font-semibold text-text sm:text-3xl">
          Still notes and docs. Now with somewhere to put the meeting.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex h-10 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-text hover:opacity-90"
          >
            Get started free
          </Link>
          <Link
            href="/#calendar"
            className="inline-flex h-10 items-center rounded-md border border-border px-5 text-sm font-medium text-text hover:bg-hover"
          >
            See the calendar
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
