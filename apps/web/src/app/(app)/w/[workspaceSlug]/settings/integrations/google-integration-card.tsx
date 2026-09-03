"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, ChevronDown, Loader2, RefreshCw, Unplug } from "lucide-react";
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notion-clone/ui";
import type { GoogleIntegrationStatus } from "@/server/integrations/google-calendar/status";
import {
  disconnectGoogleAction,
  syncGoogleCalendarAction,
  listGoogleCalendarsAction,
  selectGoogleCalendarAction,
} from "@/app/(app)/actions/integrations";

const CALLBACK_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  connected: { tone: "success", text: "Google Calendar connected." },
  declined: { tone: "error", text: "Google sign-in was cancelled — nothing was connected." },
  error: { tone: "error", text: "Couldn't connect to Google. Please try again." },
};

export function GoogleIntegrationCard({
  workspaceSlug,
  workspaceId,
  initialStatus,
  callbackResult,
}: {
  workspaceSlug: string;
  workspaceId: string;
  initialStatus: GoogleIntegrationStatus;
  callbackResult?: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [syncing, startSync] = useTransition();
  const [disconnecting, startDisconnect] = useTransition();
  const [calendars, setCalendars] = useState<{ id: string; summary: string; primary: boolean }[] | null>(null);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  useEffect(() => {
    if (!callbackResult) return;
    const message = CALLBACK_MESSAGES[callbackResult];
    if (!message) return;
    if (message.tone === "success") toast.success(message.text);
    else toast.error(message.text);
    // Strip the ?google= param so a refresh doesn't re-show the toast.
    const url = new URL(window.location.href);
    url.searchParams.delete("google");
    window.history.replaceState({}, "", url.toString());
  }, [callbackResult]);

  if (!status.configured) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5">
        <p className="text-sm font-medium text-text">Google Calendar</p>
        <p className="mt-1 text-sm text-text-muted">
          Not available on this deployment — an administrator needs to set{" "}
          <code className="rounded bg-hover px-1 py-0.5 text-xs">GOOGLE_CLIENT_ID</code> and{" "}
          <code className="rounded bg-hover px-1 py-0.5 text-xs">GOOGLE_CLIENT_SECRET</code>. See
          .env.example.
        </p>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-5">
        <div>
          <p className="text-sm font-medium text-text">Google Calendar</p>
          <p className="mt-1 text-sm text-text-muted">
            Connect your Google account to sync this workspace&apos;s calendar both ways.
          </p>
        </div>
        <a
          href={`/api/integrations/google/authorize?workspaceSlug=${workspaceSlug}`}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-accent-text hover:opacity-90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1",
          )}
        >
          Connect
        </a>
      </div>
    );
  }

  async function handleSync() {
    startSync(async () => {
      const result = await syncGoogleCalendarAction(workspaceId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Synced — ${result.value.pulled} updated, ${result.value.deleted} removed.`);
      setStatus((s) => (s.connected ? { ...s, status: "connected", lastErrorMessage: null, lastSyncedAt: new Date().toISOString() } : s));
    });
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Calendar? Events already synced here will stay, but stop updating.")) return;
    startDisconnect(async () => {
      const result = await disconnectGoogleAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Google Calendar disconnected.");
      setStatus({ configured: true, connected: false });
    });
  }

  async function handleOpenCalendarPicker() {
    if (calendars) return;
    setLoadingCalendars(true);
    const result = await listGoogleCalendarsAction();
    setLoadingCalendars(false);
    if (!result.ok) return toast.error(result.error);
    setCalendars(result.value);
  }

  async function handleSelectCalendar(googleCalendarId: string) {
    if (!status.connected) return;
    const result = await selectGoogleCalendarAction({ connectionId: status.connectionId, googleCalendarId });
    if (!result.ok) return toast.error(result.error);
    setStatus((s) => (s.connected ? { ...s, googleCalendarId } : s));
    toast.success("Calendar updated — sync now to pull its events.");
  }

  const isError = status.status === "error" || status.status === "revoked";

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text">Google Calendar</p>
            {isError ? (
              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                Needs attention
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded bg-selected px-1.5 py-0.5 text-xs font-medium text-accent">
                <CheckCircle2 className="size-3" /> Connected
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-muted">{status.googleAccountEmail}</p>
          {isError && status.lastErrorMessage ? (
            <p className="mt-1 text-sm text-destructive">{status.lastErrorMessage}</p>
          ) : null}
          <p className="mt-1 text-xs text-text-faint">
            {status.lastSyncedAt
              ? `Last synced ${new Date(status.lastSyncedAt).toLocaleString()}`
              : "Not synced yet"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isError ? (
            <a
              href={`/api/integrations/google/authorize?workspaceSlug=${workspaceSlug}`}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 text-xs font-medium text-text hover:bg-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1",
              )}
            >
              Reconnect
            </a>
          ) : (
            <Button variant="secondary" size="sm" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Sync now
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
            aria-label="Disconnect Google Calendar"
          >
            <Unplug className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-1.5 text-xs font-medium text-text-faint">Syncing calendar</p>
        <DropdownMenu onOpenChange={(open) => open && handleOpenCalendarPicker()}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full max-w-xs items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-hover",
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <CalendarDays className="size-3.5 shrink-0 text-text-faint" />
                {calendars?.find((c) => c.id === status.googleCalendarId)?.summary ?? status.googleCalendarId}
              </span>
              <ChevronDown className="size-3.5 shrink-0 text-text-faint" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {loadingCalendars ? (
              <div className="flex items-center gap-2 px-2 py-2 text-sm text-text-muted">
                <Loader2 className="size-3.5 animate-spin" /> Loading calendars…
              </div>
            ) : calendars && calendars.length > 0 ? (
              calendars.map((cal) => (
                <DropdownMenuItem key={cal.id} onSelect={() => handleSelectCalendar(cal.id)}>
                  <span className="truncate">{cal.summary}</span>
                  {cal.id === status.googleCalendarId ? (
                    <CheckCircle2 className="ml-auto size-3.5 shrink-0 text-accent" />
                  ) : null}
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-2 text-sm text-text-muted">No calendars found.</div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
