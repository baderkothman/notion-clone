"use client";

import * as React from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { createExtensions, type CreateExtensionsOptions } from "./kit";
import { SelectionToolbar } from "./toolbar/selection-toolbar";
import { DragHandle } from "./drag-handle";

export interface BlockEditorProps extends CreateExtensionsOptions {
  content: JSONContent;
  editable?: boolean;
  onUpdate?: (json: JSONContent) => void;
  /** Ref-style escape hatch for the host to call editor commands (e.g. focus) or read
   * content imperatively without re-rendering the whole tree on every keystroke. */
  onEditorReady?: (editor: import("@tiptap/react").Editor) => void;
}

export function BlockEditor({
  content,
  editable = true,
  onUpdate,
  onEditorReady,
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
    content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-editor focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onUpdate?.(editor.getJSON()),
  });

  React.useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  if (!editor) return null;

  return (
    <div className="relative">
      <SelectionToolbar editor={editor} />
      <DragHandle editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
