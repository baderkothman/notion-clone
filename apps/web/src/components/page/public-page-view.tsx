"use client";

import { BlockEditor, type JSONContent } from "@notion-clone/editor";

/**
 * Read-only render of a publicly-shared page — no sidebar, no autosave, no editing
 * affordances. `fileService`/`embedService` are null (nothing to upload/embed when
 * nothing is editable) and child-page links are inert: a visitor without a session has
 * no way to view an arbitrary child page, and we don't know whether it's itself publicly
 * shared, so linking into the authenticated app would just dead-end at a sign-in wall.
 */
export function PublicPageView({
  title,
  icon,
  coverImage,
  content,
}: {
  title: string;
  icon: string | null;
  coverImage: string | null;
  content: JSONContent;
}) {
  return (
    <div className="min-h-screen bg-bg">
      {coverImage ? (
        <div className="h-48 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="mx-auto max-w-3xl px-8 pb-24 pt-10">
        {icon ? <div className="mb-2 text-5xl">{icon}</div> : null}
        <h1 className="mb-4 text-3xl font-bold text-text">{title || "Untitled"}</h1>
        <BlockEditor
          content={content}
          editable={false}
          onNavigateToPage={() => {}}
          fileService={null}
          embedService={null}
        />
      </div>
      <footer className="border-t border-border py-4 text-center text-xs text-text-faint">
        Shared publicly via Notion Clone
      </footer>
    </div>
  );
}
