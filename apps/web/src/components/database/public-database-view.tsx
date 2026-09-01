import { File } from "lucide-react";
import type { SelectOption } from "@notion-clone/contracts";
import type { DatabaseProperty, DatabaseRow, DatabaseRowValue, DatabaseViewRecord } from "./types";
import { selectOptions, SELECT_COLOR_CLASSES } from "./types";

/**
 * Read-only render for a publicly-shared database — deliberately its own component
 * rather than the interactive `TableView` with `editable={false}`: that component's
 * individual cell inputs (text/number/url/checkbox/select/...) don't gate on
 * `editable` the way its "New row"/"New property" affordances do, so reusing it here
 * would show inputs that *look* editable but silently no-op for an anonymous visitor
 * (no session to actually persist anything against) — exactly the "fake button" this
 * project's quality bar rules out. This renders plain formatted values instead.
 * Renders the database's first view only — Notion's own public database share also
 * exposes one fixed view, not a switcher, to an anonymous visitor.
 */
export function PublicDatabaseView({
  title,
  icon,
  properties,
  views,
  rows,
  values,
}: {
  title: string;
  icon: string | null;
  properties: DatabaseProperty[];
  views: DatabaseViewRecord[];
  rows: DatabaseRow[];
  values: DatabaseRowValue[];
}) {
  const view = views[0];
  const titleProperty = properties.find((p) => p.type === "title");
  const otherProperties = properties.filter((p) => p.type !== "title");

  const valueIndex = new Map<string, Map<string, unknown>>();
  for (const v of values) {
    if (!valueIndex.has(v.rowPageId)) valueIndex.set(v.rowPageId, new Map());
    valueIndex.get(v.rowPageId)!.set(v.propertyId, v.value);
  }
  const getValue = (rowId: string, propertyId: string) => valueIndex.get(rowId)?.get(propertyId) ?? null;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-5xl px-8 py-10">
        {icon ? <div className="mb-2 text-5xl">{icon}</div> : null}
        <h1 className="mb-1 text-3xl font-bold text-text">{title || "Untitled"}</h1>
        {view ? <p className="mb-6 text-sm text-text-faint">{view.name} · {rows.length} items</p> : null}

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="min-w-[220px] border-r border-border px-2 py-1.5 text-left font-medium text-text-muted">
                  {titleProperty?.name ?? "Name"}
                </th>
                {otherProperties.map((property) => (
                  <th key={property.id} className="min-w-[140px] border-r border-border px-2 py-1.5 text-left font-medium text-text-muted">
                    {property.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0">
                  <td className="border-r border-border px-2 py-1.5">
                    <span className="flex items-center gap-1.5 text-text">
                      <span className="shrink-0 text-text-faint">{row.icon ?? <File className="h-3.5 w-3.5" />}</span>
                      <span className="truncate">{row.title || "Untitled"}</span>
                    </span>
                  </td>
                  {otherProperties.map((property) => (
                    <td key={property.id} className="border-r border-border px-2 py-1.5 text-text">
                      <ReadOnlyValue property={property} value={getValue(row.id, property.id)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="p-6 text-center text-sm text-text-faint">No items</p> : null}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyValue({ property, value }: { property: DatabaseProperty; value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-text-faint">—</span>;

  switch (property.type) {
    case "checkbox":
      return <span>{value ? "✓" : ""}</span>;
    case "url":
      return (
        <a href={String(value)} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline">
          {String(value)}
        </a>
      );
    case "select":
    case "status": {
      const options = selectOptions(property);
      const option = options.find((o) => o.id === value);
      return option ? <Pill option={option} /> : <span className="text-text-faint">—</span>;
    }
    case "multi_select": {
      const options = selectOptions(property);
      const selected = Array.isArray(value) ? options.filter((o) => value.includes(o.id)) : [];
      return (
        <span className="flex flex-wrap gap-1">
          {selected.map((o) => (
            <Pill key={o.id} option={o} />
          ))}
        </span>
      );
    }
    case "files": {
      const files = Array.isArray(value) ? (value as { filename: string }[]) : [];
      return <span className="text-text-faint">{files.length > 0 ? `${files.length} file(s)` : "—"}</span>;
    }
    default:
      return <span>{String(value)}</span>;
  }
}

function Pill({ option }: { option: SelectOption }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${SELECT_COLOR_CLASSES[option.color] ?? SELECT_COLOR_CLASSES.gray}`}>
      {option.name}
    </span>
  );
}
