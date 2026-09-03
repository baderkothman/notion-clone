"use client";

import * as React from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { createExtensions, type CreateExtensionsOptions } from "./kit";
import { SelectionToolbar } from "./toolbar/selection-toolbar";
import { DragHandle } from "./drag-handle";
import { CommentIndicators } from "./comment-indicators";

export interface BlockEditorProps extends CreateExtensionsOptions {
  content: JSONContent;
  editable?: boolean;
  onUpdate?: (json: JSONContent) => void;
  /** Ref-style escape hatch for the host to call editor commands (e.g. focus) or read
   * content imperatively without re-rendering the whole tree on every keystroke. */
  onEditorReady?: (editor: import("@tiptap/react").Editor) => void;
  /** Wires up block-scoped commenting: `onCommentBlock` fires when the user clicks the
   * comment icon in a block's hover gutter; `commentedBlockIds` marks which blocks
   * already have a thread (rendered as right-margin badges via CommentIndicators).
   * Both optional — the editor works standalone without a comments panel to talk to. */
  onCommentBlock?: (blockId: string) => void;
  commentedBlockIds?: Set<string>;
}

export function BlockEditor({
  content,
  editable = true,
  onUpdate,
  onEditorReady,
  onCommentBlock,
  commentedBlockIds,
  ...extensionOptions
}: BlockEditorProps) {
  const extensions = React.useMemo(
    () => createExtensions(extensionOptions),
    // Extension identity must stay stable across renders (Tiptap re-creates the whole
    // editor otherwise) — callbacks are captured once at mount, matching how Tiptap
    // extensions are meant to be configured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const editor = useEditor({
    extensions,
    // In collaboration mode, the Collaboration extension owns content — it's synced
    // from the Yjs doc, not this prop. Passing both would fight each other and Tiptap
    // warns loudly about exactly that combination.
    content: extensionOptions.collaboration ? undefined : content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-editor focus:outline-none",
      },
    },
    onCreate: ({ editor }) => onEditorReady?.(editor),
    onUpdate: ({ editor }) => onUpdate?.(editor.getJSON()),
  });

  // The gutter (DragHandle) and margin badges (CommentIndicators) render as siblings of
  // EditorContent, but need to track pointer position relative to a container that
  // actually contains BOTH — not `editor.view.dom.parentElement`, which is only
  // EditorContent's own internal wrapper div (a level too deep: moving the pointer from
  // the text onto the gutter would cross out of that div's boundary and fire
  // `mouseleave`, unmounting the gutter mid-hover). An explicit ref to the real outer
  // container sidesteps relying on Tiptap's internal DOM structure.
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  if (!editor) return null;

  return (
    <div className="relative" ref={containerRef}>
      {editable ? (
        <>
          <SelectionToolbar editor={editor} />
          <DragHandle editor={editor} container={containerRef} onCommentBlock={onCommentBlock} />
        </>
      ) : null}
      {onCommentBlock && commentedBlockIds && commentedBlockIds.size > 0 ? (
        <CommentIndicators editor={editor} container={containerRef} commentedBlockIds={commentedBlockIds} onOpenBlock={onCommentBlock} />
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
