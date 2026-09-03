#!/usr/bin/env node
/**
 * Runs React Doctor's full health scan and its design scan, then turns the combined
 * findings into a single markdown prompt an agentic coding CLI (Claude Code, Codex,
 * etc.) can fix from directly:
 *
 *   pnpm doctor:prompt | claude
 *   pnpm doctor:prompt | codex exec
 *   pnpm doctor:prompt > .react-doctor/fix-prompt.md   # then paste/open it yourself
 *
 * The prompt itself (not just the raw findings) is the point: react-doctor's own
 * output is a lint-style list, and handing that to an agent unmodified invites exactly
 * what this repo's own docs/IMPROVEMENT_PLAN.md found the hard way — mass "fixes" to
 * findings that were actually false positives or intentional patterns. This script
 * bakes that pass's operating discipline into the prompt every time, so a future
 * fix-pass starts from the same bar instead of rediscovering it.
 *
 * Everything react-doctor prints (progress, its own summary) goes to stderr; stdout is
 * the generated prompt only (or a short summary with `--summary`), so piping this
 * straight into another CLI works cleanly.
 *
 * Flags:
 *   --scope <full|changed|files|lines>  forwarded to react-doctor (default: full).
 *                                       `changed` is what .husky/pre-push uses — only
 *                                       new issues vs. the push's base ref, so a push
 *                                       doesn't pay for a whole-repo scan every time.
 *   --base <ref>                        forwarded to react-doctor's --base.
 *   --summary                           print a short summary instead of the full
 *                                       prompt (the full prompt is still written to
 *                                       .react-doctor/fix-prompt.md either way).
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoRoot, ".react-doctor");
const outputFile = path.join(outputDir, "fix-prompt.md");

const args = process.argv.slice(2);
function flagValue(name) {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}
const scope = flagValue("--scope") ?? "full";
const base = flagValue("--base");
const summaryOnly = args.includes("--summary");
const scanArgs = ["--scope", scope, ...(base ? ["--base", base] : [])];

function runScan(extraArgs, label) {
  const jsonOut = path.join(mkdtempSync(path.join(tmpdir(), "react-doctor-")), "report.json");
  process.stderr.write(`\n▶ Running react-doctor ${label} scan (scope: ${scope})…\n`);
  try {
    execFileSync(
      "npx",
      ["--yes", "react-doctor@latest", ...extraArgs, ...scanArgs, "--json", "--json-out", jsonOut, "-y", "--no-color"],
      { cwd: repoRoot, stdio: ["ignore", "ignore", "inherit"] },
    );
  } catch (error) {
    // react-doctor exits non-zero whenever it finds diagnostics — that's the normal
    // case here, not a failure. Only treat this as fatal if it didn't even get far
    // enough to write the report: otherwise the failure below would just be a
    // confusing ENOENT instead of react-doctor's own (already-printed, on stderr)
    // reason for not running.
    if (!existsSync(jsonOut)) {
      process.stderr.write(`\n✗ react-doctor ${label} scan failed to produce a report: ${error.message}\n`);
      process.exit(1);
    }
  }
  return JSON.parse(readFileSync(jsonOut, "utf8"));
}

const full = runScan([], "full health");
const design = runScan(["design"], "design");

// Design rules are opt-in-only during the full scan (per `react-doctor design --help`),
// so overlap should be rare — dedupe by `id` anyway since it's cheap and makes the
// merge safe regardless of that staying true across react-doctor versions.
const seen = new Set();
const findings = [...full.diagnostics, ...design.diagnostics].filter((d) => {
  if (seen.has(d.id)) return false;
  seen.add(d.id);
  return true;
});

if (findings.length === 0) {
  process.stderr.write("\n✓ No react-doctor findings — nothing to generate a fix prompt for.\n");
  process.exit(0);
}

const severityRank = (s) => (s === "error" ? 0 : s === "warning" ? 1 : 2);

// category -> rule -> { severity, title, help, occurrences: [{file, line, message}] }
const grouped = new Map();
for (const d of findings) {
  if (!grouped.has(d.category)) grouped.set(d.category, new Map());
  const byRule = grouped.get(d.category);
  if (!byRule.has(d.rule)) byRule.set(d.rule, { severity: d.severity, title: d.title, help: d.help, occurrences: [] });
  byRule.get(d.rule).occurrences.push({ file: d.normalizedFilePath ?? d.filePath, line: d.line, message: d.message });
}

const categoryOrder = [...grouped.keys()].sort((a, b) => {
  const rankOf = (cat) => Math.min(...[...grouped.get(cat).values()].map((r) => severityRank(r.severity)));
  return rankOf(a) - rankOf(b);
});

function renderFindings() {
  const sections = [];
  for (const category of categoryOrder) {
    const rules = grouped.get(category);
    const ruleEntries = [...rules.entries()].sort((a, b) => severityRank(a[1].severity) - severityRank(b[1].severity));
    const lines = [`### ${category}`, ""];
    for (const [rule, info] of ruleEntries) {
      const badge = info.severity === "error" ? "🔴 error" : "🟡 warning";
      lines.push(`**${info.title}** — \`${rule}\` (${badge}, ${info.occurrences.length}×)`);
      lines.push(info.help);
      lines.push("");
      for (const occ of info.occurrences) {
        lines.push(`- \`${occ.file}:${occ.line}\` — ${occ.message}`);
      }
      lines.push("");
    }
    sections.push(lines.join("\n"));
  }
  return sections.join("\n");
}

const totalErrors = findings.filter((d) => d.severity === "error").length;
const totalWarnings = findings.filter((d) => d.severity === "warning").length;

const prompt = `# Fix react-doctor findings

React Doctor found **${findings.length}** diagnostics across this repo (**${totalErrors}** error${totalErrors === 1 ? "" : "s"}, **${totalWarnings}** warning${totalWarnings === 1 ? "" : "s"}) — full-health score ${full.summary.score ?? "n/a"}/100 (${full.summary.scoreLabel ?? "n/a"}). They're listed below, grouped by category and rule.

## How to work through this

Go one finding (or one closely-related group) at a time. This is a correctness/quality pass on a real, tested codebase — not a chance to batch-apply a regex fix and move on. Specifically:

1. **Read the finding, then read the actual code around it, before changing anything.** A rule name is a hypothesis, not a verdict — react-doctor's own history in this repo (see \`docs/IMPROVEMENT_PLAN.md\`) includes findings that turned out to be false positives (an intentional pattern, or a tool limitation) and at least one finding that looked obviously fixable but wasn't actually a bug once tested with a real interaction, not just \`element.click()\`. If a finding looks wrong, say so and explain why, rather than fixing it to make the tool quiet.
2. **Use \`npx react-doctor why <file>:<line>\`** when a finding's reasoning isn't obvious from the message alone — it explains why the rule fired (or why a suppression didn't apply) at that exact location.
3. **Fix the smallest diff that addresses the actual problem.** Don't refactor adjacent code while you're in a file for an unrelated finding, and don't introduce a new abstraction (state library, helper layer) to satisfy one rule.
4. **Never silence a finding by disabling the rule, adding an inline suppression, or loosening a type** unless you've confirmed it's a genuine false positive and you say so explicitly in your summary — the goal is fewer real problems, not a quieter scan.
5. **Verify every fix**, not just that the file still compiles:
   - \`pnpm typecheck && pnpm lint\` after every batch of related fixes, not only at the end.
   - \`pnpm -r test\` (unit) and, for anything touching a server/domain module, \`pnpm test:integration\`.
   - For UI/interaction fixes (hover states, drag-and-drop, keyboard focus, anything event-driven), verify with an actual pointer/keyboard interaction in a real browser session — not just that a Playwright \`.click()\` succeeded, which can pass against code that's broken for a real user (this exact gap has hidden a real bug in this repo before).
6. **Re-run the scan after a batch of fixes** (\`pnpm doctor\`, or re-run this script) rather than assuming a fix worked — confirm the specific finding is actually gone, and check you haven't introduced a new one in the files you touched.
7. **When you're done**, summarize what you fixed, what you investigated and deliberately left (with your reasoning), and update \`tasks/todo.md\` the way this repo's own past passes have — that record is what stops the next pass from re-litigating a settled question.

## Findings

${renderFindings()}

## Final check before you consider this done

\`\`\`
pnpm typecheck
pnpm lint
pnpm -r test
pnpm test:integration
pnpm --filter web build
pnpm --filter web exec playwright test
\`\`\`

All of the above should be clean (or any remaining failure should be pre-existing and unrelated to your changes — say so explicitly if that's the case, don't just note "some failures").
`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputFile, prompt);
const relOutputFile = path.relative(repoRoot, outputFile);
process.stderr.write(`\n✓ Wrote prompt to ${relOutputFile} (${findings.length} findings)\n\n`);

if (summaryOnly) {
  const summary = `react-doctor (scope: ${scope}): ${findings.length} finding${findings.length === 1 ? "" : "s"} (${totalErrors} error${totalErrors === 1 ? "" : "s"}, ${totalWarnings} warning${totalWarnings === 1 ? "" : "s"}).
Full fix prompt written to ${relOutputFile}.
Hand it to an agent:  cat ${relOutputFile} | claude   (or: | codex exec)
`;
  process.stdout.write(summary);
} else {
  process.stdout.write(prompt);
}
