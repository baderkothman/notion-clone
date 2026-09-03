import { Database, FileText, Globe2, Star } from "lucide-react";

/** A built mockup of the real app shell — same tokens (bg-sidebar, border-border,
 * bg-selected) the product itself uses, not a screenshot. Shown inside browser
 * chrome carrying a custom domain, because "point it at your own domain" is part of
 * what self-hosting buys you — the chrome is doing brief work, not decoration. */
export function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--color-shadow)]">
      <div className="flex items-center gap-2 border-b border-border bg-sidebar px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <div className="ml-3 flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-2 text-xs text-text-faint">
          <Globe2 className="size-3" />
          workspace.acme.internal
        </div>
      </div>
      <div className="flex h-80 sm:h-96">
        <div className="hidden w-52 shrink-0 flex-col border-r border-border bg-sidebar p-3 sm:flex">
          <div className="mb-3 flex items-center gap-1.5 rounded-md px-1.5 py-1">
            <span className="flex size-5 items-center justify-center rounded bg-text text-xs font-semibold text-bg">
              A
            </span>
            <span className="text-xs font-medium text-text">Acme</span>
          </div>
          <SidebarRow icon={<Star className="size-3.5" />} label="Roadmap" />
          <SidebarRow icon={<FileText className="size-3.5" />} label="Engineering" active />
          <SidebarRow icon={<FileText className="size-3.5" />} label="Meeting notes" indent />
          <SidebarRow icon={<Database className="size-3.5" />} label="Sprint tracker" indent />
          <SidebarRow icon={<FileText className="size-3.5" />} label="Design" />
        </div>
        <div className="flex-1 overflow-hidden p-6 sm:p-8">
          <p className="text-2xl font-semibold text-text sm:text-3xl">Engineering</p>
          <div className="mt-4 space-y-2.5">
            <div className="h-2.5 w-5/6 rounded-full bg-hover" />
            <div className="h-2.5 w-2/3 rounded-full bg-hover" />
            <div className="h-2.5 w-4/5 rounded-full bg-hover" />
          </div>
          <div className="mt-6 overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-3 border-b border-border bg-sidebar text-xs font-medium text-text-muted">
              <div className="border-r border-border px-3 py-2">Task</div>
              <div className="border-r border-border px-3 py-2">Owner</div>
              <div className="px-3 py-2">Status</div>
            </div>
            {["Realtime sync", "Sharing permissions"].map((task) => (
              <div key={task} className="grid grid-cols-3 border-b border-border text-xs last:border-b-0">
                <div className="border-r border-border px-3 py-2 text-text">{task}</div>
                <div className="border-r border-border px-3 py-2 text-text-muted">—</div>
                <div className="px-3 py-2">
                  <span className="rounded bg-selected px-1.5 py-0.5 text-accent">In progress</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarRow({
  icon,
  label,
  active,
  indent,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs ${indent ? "ml-4" : ""} ${
        active ? "bg-selected text-text" : "text-text-muted"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}
