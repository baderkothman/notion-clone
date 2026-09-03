"use client";

import { useEffect, useState } from "react";
import { domAnimation, LazyMotion, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

type Line =
  | { id: string; kind: "cmd"; text: string }
  | { id: string; kind: "ok"; label: string; detail: string }
  | { id: string; kind: "note"; text: string };

/** The actual services this repo brings up — see docker-compose.yml (postgres,
 * minio) and each app's own dev script (apps/web, apps/realtime). Not a stock
 * "spin up your app" animation: these are this project's real service names and
 * default ports, in the order `docker compose up -d && pnpm dev` produces them. */
const SEQUENCE: Line[] = [
  { id: "compose", kind: "cmd", text: "docker compose up -d" },
  { id: "postgres", kind: "ok", label: "postgres", detail: "ready · :5433" },
  { id: "minio", kind: "ok", label: "minio", detail: "ready · :9000" },
  { id: "dev", kind: "cmd", text: "pnpm dev" },
  { id: "web", kind: "ok", label: "web", detail: "ready · localhost:3000" },
  { id: "realtime", kind: "ok", label: "realtime", detail: "ready · ws:1234" },
  { id: "ready", kind: "note", text: "your workspace is up." },
];

const STEP_MS = 550;
const LINE_ANIMATE = { opacity: 1, y: 0 };

/** Hero signature: types out this repo's real boot sequence line by line, then holds
 * on the finished state. Reduced-motion / no-JS both render the finished state
 * immediately — this is texture, not information the page depends on. */
export function TerminalBoot() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(reduced ? SEQUENCE.length : 0);

  useEffect(() => {
    if (reduced) return;
    if (visible >= SEQUENCE.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [visible, reduced]);

  const lines = SEQUENCE.slice(0, visible);
  const done = visible >= SEQUENCE.length;

  return (
    <LazyMotion features={domAnimation}>
    <div className="w-full overflow-hidden rounded-xl border border-terminal-border bg-terminal-bg shadow-[var(--color-shadow)]">
      <div className="flex items-center gap-1.5 border-b border-terminal-border bg-terminal-surface px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#f47171]" />
        <span className="size-2.5 rounded-full bg-[#e0973b]" />
        <span className="size-2.5 rounded-full bg-terminal-green" />
        <span className="ml-2 font-mono-brand text-xs text-terminal-dim">self-host.sh</span>
      </div>
      <div
        className="min-h-64 px-5 py-4 font-mono-brand text-[0.8125rem] leading-6"
        aria-live="polite"
        aria-label="Terminal output starting this project's services"
      >
        {lines.map((line) => (
          <TerminalLine key={line.id} line={line} reduced={!!reduced} />
        ))}
        {!done ? (
          <span className="mt-0.5 inline-block h-[14px] w-[7px] animate-pulse bg-terminal-text align-middle" />
        ) : null}
      </div>
    </div>
    </LazyMotion>
  );
}

function TerminalLine({ line, reduced }: { line: Line; reduced: boolean }) {
  const initial = reduced ? false : { opacity: 0, y: 4 };
  if (line.kind === "cmd") {
    return (
      <m.p initial={initial} animate={LINE_ANIMATE} transition={{ duration: 0.15 }} className="text-terminal-text">
        <span className="text-terminal-dim">$ </span>
        {line.text}
      </m.p>
    );
  }
  if (line.kind === "ok") {
    return (
      <m.p initial={initial} animate={LINE_ANIMATE} transition={{ duration: 0.15 }} className="pl-4">
        <span className="text-terminal-green">✓</span>{" "}
        <span className="text-terminal-text">{line.label}</span>{" "}
        <span className="text-terminal-dim">{line.detail}</span>
      </m.p>
    );
  }
  return (
    <m.p
      initial={initial}
      animate={LINE_ANIMATE}
      transition={{ duration: 0.2 }}
      className="mt-2 text-terminal-blue"
    >
      {line.text}
    </m.p>
  );
}
