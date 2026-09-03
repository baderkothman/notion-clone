"use client";

import * as React from "react";

type LocalDateFormat = "time" | "date" | "dateTime" | "agendaDay";

const FORMATTERS: Record<LocalDateFormat, Intl.DateTimeFormat> = {
  time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }),
  date: new Intl.DateTimeFormat("en-US", { year: "numeric", month: "numeric", day: "numeric" }),
  dateTime: new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }),
  agendaDay: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }),
};

function formatLocalDate(date: Date, format: LocalDateFormat): string {
  if (format === "agendaDay") {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  }

  return FORMATTERS[format].format(date);
}

export function LocalDateText({ value, format }: { value: Date | string; format: LocalDateFormat }) {
  const timestamp = new Date(value).getTime();
  const date = new Date(timestamp);
  const fallback = format === "time" ? "--:--" : date.toISOString().replace("T", " ").slice(0, format === "dateTime" ? 16 : 10);
  const [text, setText] = React.useState(fallback);

  React.useEffect(() => {
    setText(formatLocalDate(new Date(timestamp), format));
  }, [format, timestamp]);

  return <time dateTime={date.toISOString()}>{text}</time>;
}
