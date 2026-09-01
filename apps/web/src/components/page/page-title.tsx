"use client";

import * as React from "react";

export function PageTitle({
  initialTitle,
  onChange,
  onEnter,
}: {
  initialTitle: string;
  onChange: (title: string) => void;
  onEnter: () => void;
}) {
  const [value, setValue] = React.useState(initialTitle);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onChange(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        }
      }}
      placeholder="Untitled"
      rows={1}
      aria-label="Page title"
      className="w-full resize-none overflow-hidden bg-transparent text-3xl font-bold text-text outline-none placeholder:text-text-faint"
    />
  );
}
