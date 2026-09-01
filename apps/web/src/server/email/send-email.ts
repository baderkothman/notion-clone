import "server-only";
import { Resend } from "resend";

let client: Resend | null | undefined;

function getClient(): Resend | null {
  if (client !== undefined) return client;
  const apiKey = process.env.RESEND_API_KEY;
  client = apiKey ? new Resend(apiKey) : null;
  return client;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Real delivery when `RESEND_API_KEY` is set; otherwise logs to the console so local
 * development can still exercise the full invite/reset flow without a Resend account
 * (the same "logs to console in dev" pattern documented in docs/SECURITY.md — this is
 * what replaces it once configured). Never throws on delivery failure for a
 * non-security-critical email (invite) — the caller already succeeded at the thing
 * that matters (creating the invitation record); a bounced email shouldn't roll that
 * back. Password-reset callers should still treat a thrown error as unexpected, since
 * silently failing to deliver a reset link is a real usability problem, not a footnote.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const resend = getClient();

  if (!resend) {
    console.info(`[email:dev] To: ${input.to}\nSubject: ${input.subject}\n${input.text}`);
    return;
  }

  const from = process.env.EMAIL_FROM || "Notion Clone <onboarding@resend.dev>";
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    console.error("[email] Resend delivery failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
