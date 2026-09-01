import "server-only";
import { ValidationError } from "@notion-clone/shared";
import { assertSafeExternalUrl } from "./ssrf-guard";
import type { LinkMetadata } from "@notion-clone/contracts";

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;

function extract(html: string, pattern: RegExp): string | null {
  return pattern.exec(html)?.[1]?.trim() ?? null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

/**
 * Fetches and parses just enough of a page's <head> to build a bookmark preview.
 * Every network call here is preceded by `assertSafeExternalUrl` — see
 * docs/SECURITY.md "URL processing" for the SSRF threat model and its known residual
 * (DNS-rebinding-between-check-and-fetch) limitation.
 */
export async function fetchLinkMetadata(rawUrl: string): Promise<LinkMetadata> {
  const url = await assertSafeExternalUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "notion-clone-bookmark-bot/1.0" },
    });
    if (!response.ok) throw new ValidationError("That link couldn't be reached.");

    // Re-validate the final URL in case of a redirect to a private address.
    if (response.url && response.url !== url.toString()) {
      await assertSafeExternalUrl(response.url);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new ValidationError("That link couldn't be reached.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) break;
      chunks.push(value);
    }
    html = Buffer.concat(chunks).toString("utf-8");
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("That link couldn't be reached.");
  } finally {
    clearTimeout(timeout);
  }

  const title =
    extract(html, /<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) ??
    extract(html, /<title>([^<]*)<\/title>/i) ??
    url.hostname;

  const description =
    extract(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i) ??
    extract(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ??
    "";

  const iconHref = extract(html, /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']*)["']/i);
  const faviconUrl = iconHref
    ? new URL(iconHref, url).toString()
    : `${url.protocol}//${url.host}/favicon.ico`;

  return {
    url: url.toString(),
    title: decodeEntities(title).slice(0, 300),
    description: decodeEntities(description).slice(0, 500),
    faviconUrl,
  };
}
