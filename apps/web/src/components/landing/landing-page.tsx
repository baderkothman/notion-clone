import Link from "next/link";
import { Blocks, MessagesSquare, Radio, Table2 } from "lucide-react";
import { TerminalBoot } from "./terminal-boot";
import { ProductPreview } from "./product-preview";
import { CalendarPreview } from "./calendar-preview";
import { SiteHeader, SiteFooter } from "./site-chrome";

const FEATURES = [
  {
    key: "blocks",
    icon: Blocks,
    title: "A block editor that stays out of the way",
    body: "Headings, lists, tables, code, and embeds — write with '/' commands, drag blocks to reorder, nest pages inside pages.",
  },
  {
    key: "db",
    icon: Table2,
    title: "Databases, not just documents",
    body: "Structured records with typed columns, filtered table and board views, so the same data works as a doc and a tracker.",
  },
  {
    key: "realtime",
    icon: Radio,
    title: "Edits appear as they happen",
    body: "Live cursors and content sync over your own realtime service — no refresh, no merge conflicts, no third party in the loop.",
  },
  {
    key: "share",
    icon: MessagesSquare,
    title: "Share exactly as far as you mean to",
    body: "Invite a person to a workspace, a page, or hand out a read-only link — with comments scoped to what they can see.",
  },
] as const;

const COMPARISON = [
  { key: "data_location", label: "Where the data lives", hosted: "A vendor's database", self: "Your Postgres instance" },
  { key: "uptime", label: "Uptime depends on", hosted: "Their status page", self: "Your infrastructure" },
  { key: "domain", label: "Custom / internal domain", hosted: "Enterprise tier only", self: "Yes — it's your network" },
  { key: "seats", label: "Adding people", hosted: "Priced per seat", self: "Unlimited, it's your hardware" },
  { key: "extending", label: "Extending it", hosted: "Rate-limited public API", self: "Open source — edit the code" },
] as const;

export function LandingPage() {
  return (
    <div className="bg-bg">
      <SiteHeader />
      <Hero />
      <CalendarSpotlight />
      <ComparisonSection />
      <PreviewSection />
      <FeaturesSection />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-10 lg:pb-28 lg:pt-20">
      <div>
        <p className="font-mono-brand text-xs text-text-faint">$ open source · self-hosted</p>
        <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.08] tracking-tight text-text sm:text-5xl lg:text-[3.4rem]">
          Your workspace.
          <br />
          Your server.
          <br />
          Your data.
        </h1>
        <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-text-muted">
          Notes, docs, databases — and a real calendar, which hosted Notion still doesn&apos;t
          have. All running on infrastructure you control. One{" "}
          <code className="rounded bg-hover px-1 py-0.5 font-mono-brand text-[0.85em] text-text">docker compose up</code>{" "}
          away from a workspace nothing outside your network can see.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex h-10 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-text hover:opacity-90"
          >
            Get started free
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center rounded-md border border-border px-5 text-sm font-medium text-text hover:bg-hover"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-3 text-xs text-text-faint">Free to start. No credit card required.</p>
      </div>
      <TerminalBoot />
    </section>
  );
}

function CalendarSpotlight() {
  return (
    <section id="calendar" className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-14">
        <div>
          <p className="font-mono-brand text-xs text-text-faint">the_feature_notion_skipped</p>
          <h2 className="mt-3 text-balance font-display text-2xl font-semibold text-text sm:text-3xl">
            The calendar hosted Notion never built.
          </h2>
          <p className="mt-4 max-w-md text-pretty text-text-muted">
            Notion still has no native calendar — years in, it&apos;s one of the most
            common gaps people run into. This workspace has one built in, syncing both
            ways with Google Calendar: create an event here, it shows up there; edit it
            there, it shows up here.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
              Month, week, day, and agenda views — a first-class page, not a database
              trick.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
              Two-way Google Calendar sync, with incremental updates once connected.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
              Drag an event to a new day and it reschedules — locally and on Google.
            </li>
          </ul>
        </div>
        <CalendarPreview />
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section id="own-the-stack" className="border-y border-border bg-sidebar">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="font-mono-brand text-xs text-text-faint">own_the_stack.yml</p>
        <h2 className="mt-3 max-w-lg text-balance font-display text-2xl font-semibold text-text sm:text-3xl">
          Same workspace. Different owner.
        </h2>
        {/* Desktop: a real 3-column table. Below `sm`, a table forces a choice between
            tiny text and a horizontal scroll that hides the column doing the actual
            selling (the whole point of this section) past the fold — so mobile gets
            its own stacked layout instead of a squeezed/cropped copy of this one. */}
        <div className="mt-8 hidden overflow-x-auto rounded-xl border border-border bg-surface sm:block">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="w-[38%] px-5 py-3 font-mono-brand text-xs font-medium text-text-faint">key</th>
                <th className="w-[31%] px-5 py-3 font-medium text-text-muted">Hosted Notion</th>
                <th className="w-[31%] px-5 py-3 font-medium text-text">Notion Clone, self-hosted</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.key} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3.5 align-top">
                    <div className="font-mono-brand text-[11px] text-text-faint">{row.key}</div>
                    <div className="text-text">{row.label}</div>
                  </td>
                  <td className="px-5 py-3.5 align-top text-text-muted">{row.hosted}</td>
                  <td className="px-5 py-3.5 align-top font-medium text-text">{row.self}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 space-y-2 sm:hidden">
          {COMPARISON.map((row) => (
            <div key={row.key} className="rounded-xl border border-border bg-surface p-4">
              <div className="font-mono-brand text-[11px] text-text-faint">{row.key}</div>
              <div className="text-sm text-text">{row.label}</div>
              <div className="mt-3 flex items-start justify-between gap-3 border-t border-border pt-3 text-sm">
                <span className="text-text-muted line-through decoration-border-strong">{row.hosted}</span>
                <span className="text-right font-medium text-text">{row.self}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PreviewSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
        <div>
          <p className="font-mono-brand text-xs text-text-faint">the_actual_ui</p>
          <h2 className="mt-3 text-balance font-display text-2xl font-semibold text-text sm:text-3xl">
            Familiar to write in, on the first day.
          </h2>
          <p className="mt-4 max-w-sm text-pretty text-text-muted">
            Nested pages, a sidebar that mirrors your structure, and databases that live
            alongside your docs instead of in a separate tool.
          </p>
        </div>
        <ProductPreview />
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="border-t border-border bg-sidebar">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="font-mono-brand text-xs text-text-faint">what_it_does</p>
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          {FEATURES.map(({ key, icon: Icon, title, body }) => (
            <div key={key} className="bg-surface p-6">
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-accent" />
                <span className="font-mono-brand text-xs text-text-faint">[{key}]</span>
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-text">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

