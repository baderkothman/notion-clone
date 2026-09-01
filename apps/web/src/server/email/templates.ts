/**
 * Deliberately no `import "server-only"` here (unlike send-email.ts) — these are pure
 * string-building functions with no secrets/env access, kept importable from a plain
 * Vitest run (see templates.test.ts) the same way resolve-core.ts and
 * prune-revisions-core.ts stay pure and testable next to their I/O-touching wrappers.
 */

/** Minimal inline-styled HTML — no build step, no external CSS, safe in every email
 * client's stripped-down renderer. Both templates interpolate only server-generated
 * values (URLs built from trusted config, names/emails already validated by Zod
 * upstream), never raw unescaped user input beyond a name/workspace name, which is
 * plain text content position (not an href/attribute), so there's no injection surface
 * here worth a templating library. */
function wrapper(bodyHtml: string): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #37352f;">
  <div style="font-weight: 700; font-size: 16px; margin-bottom: 24px;">Notion Clone</div>
  ${bodyHtml}
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e9e8e5; font-size: 12px; color: #9b9a97;">
    You received this email because someone referenced your email address on Notion Clone.
  </div>
</div>`.trim();
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #2f80ed; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">${label}</a>`;
}

export function workspaceInviteEmail(params: { workspaceName: string; inviteUrl: string }) {
  const html = wrapper(`
    <p style="font-size: 14px; line-height: 1.6;">You've been invited to join <strong>${params.workspaceName}</strong> on Notion Clone.</p>
    ${button(params.inviteUrl, "Accept invitation")}
    <p style="margin-top: 16px; font-size: 12px; color: #9b9a97;">This link expires in 7 days.</p>
  `);
  const text = `You've been invited to join ${params.workspaceName} on Notion Clone.\n\nAccept: ${params.inviteUrl}\n\nThis link expires in 7 days.`;
  return { subject: `You're invited to join ${params.workspaceName}`, html, text };
}

export function passwordResetEmail(params: { resetUrl: string }) {
  const html = wrapper(`
    <p style="font-size: 14px; line-height: 1.6;">Someone requested a password reset for this email address. If that was you, choose a new password below.</p>
    ${button(params.resetUrl, "Reset password")}
    <p style="margin-top: 16px; font-size: 12px; color: #9b9a97;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  `);
  const text = `Reset your password: ${params.resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`;
  return { subject: "Reset your password", html, text };
}
