"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Table2, Columns3, List as ListIcon, CalendarDays } from "lucide-react";
import { Button, cn } from "@notion-clone/ui";
import type { SelectOption, FilterCondition, SortCondition } from "@notion-clone/contracts";
import {
  createPropertyAction,
  updatePropertyAction,
  deletePropertyAction,
  createRowAction,
  setRowValueAction,
  createViewAction,
  updateViewAction,
} from "@/app/(app)/actions/databases";
import { updatePageTitleAction } from "@/app/(app)/actions/pages";
import { nextOptionColor, type DatabaseProperty, type DatabaseRow, type DatabaseRowValue, type DatabaseViewRecord } from "./types";
import type { WorkspaceMemberOption } from "./property-cell";
import { TableView } from "./table-view";
import { BoardView } from "./board-view";
import { ListView } from "./list-view";
import { CalendarView } from "./calendar-view";
import { NewPropertyButton } from "./new-property-button";
import { FilterControl, SortControl } from "./filter-sort-controls";
import { filterRows, sortRows } from "./filter-sort-core";

export interface DatabaseViewProps {
  workspaceId: string;
  workspaceSlug: string;
  databasePageId: string;
  editable: boolean;
  initialProperties: DatabaseProperty[];
  initialRows: DatabaseRow[];
  initialValues: DatabaseRowValue[];
  initialViews: DatabaseViewRecord[];
  members: WorkspaceMemberOption[];
}

/** rowId -> propertyId -> value, rebuilt whenever the flat `values` array changes — O(1)
 * cell lookups instead of an array `.find()` per cell per render. */
function indexValues(values: DatabaseRowValue[]): Map<string, Map<string, unknown>> {
  const index = new Map<string, Map<string, unknown>>();
  for (const v of values) {
    if (!index.has(v.rowPageId)) index.set(v.rowPageId, new Map());
    index.get(v.rowPageId)!.set(v.propertyId, v.value);
  }
  return index;
}

const VIEW_ICONS = { table: Table2, board: Columns3, list: ListIcon, calendar: CalendarDays } as const;

function DatabaseViewTabs({
  views,
  activeViewId,
  editable,
  onSelect,
  onAdd,
}: {
  views: DatabaseViewRecord[];
  activeViewId: string | undefined;
  editable: boolean;
  onSelect: (viewId: string) => void;
  onAdd: (type: DatabaseViewRecord["type"]) => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-1 border-b border-border">
      {views.map((view) => {
        const Icon = VIEW_ICONS[view.type];
        return (
          <button
            key={view.id}
            onClick={() => onSelect(view.id)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm",
              view.id === activeViewId
                ? "border-text text-text"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            <Icon className="size-3.5" />
            {view.name}
          </button>
        );
      })}
      {editable ? (
        <div className="ml-auto mb-1 flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => onAdd("table")}>
            <Plus className="size-3.5" /> Table
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAdd("board")}>
            <Plus className="size-3.5" /> Board
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAdd("list")}>
            <Plus className="size-3.5" /> List
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAdd("calendar")}>
            <Plus className="size-3.5" /> Calendar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DatabaseViewControls({
  activeView,
  activeViewId,
  properties,
  editable,
  onSetGroupBy,
  onSetDateProperty,
  onSetFilters,
  onSetSorts,
}: {
  activeView: DatabaseViewRecord | null;
  activeViewId: string | null;
  properties: DatabaseProperty[];
  editable: boolean;
  onSetGroupBy: (propertyId: string | null) => void;
  onSetDateProperty: (propertyId: string | null) => void;
  onSetFilters: (filters: FilterCondition[]) => void;
  onSetSorts: (sorts: SortCondition[]) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {activeView?.type === "board" ? (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span>Group by</span>
          <select
            value={(activeView.config.groupByPropertyId as string | undefined) ?? ""}
            onChange={(e) => onSetGroupBy(e.target.value || null)}
            aria-label="Group by"
            className="rounded-md border border-border bg-surface px-2 py-1 text-base"
            disabled={!editable}
          >
            <option value="">None</option>
            {properties.reduce<React.ReactNode[]>((options, property) => {
              if (property.type === "select" || property.type === "status") {
                options.push(
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>,
                );
              }
              return options;
            }, [])}
          </select>
        </div>
      ) : null}
      {activeView?.type === "calendar" ? (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span>Date property</span>
          <select
            value={(activeView.config.datePropertyId as string | undefined) ?? ""}
            onChange={(e) => onSetDateProperty(e.target.value || null)}
            aria-label="Date property"
            className="rounded-md border border-border bg-surface px-2 py-1 text-base"
            disabled={!editable}
          >
            <option value="">None</option>
            {properties.reduce<React.ReactNode[]>((options, property) => {
              if (property.type === "date") {
                options.push(
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>,
                );
              }
              return options;
            }, [])}
          </select>
        </div>
      ) : null}
      <FilterControl
        // Remounts when the active view changes, so its internal per-row key
        // tracking starts from a clean slate for each view.
        key={`filters-${activeViewId}`}
        properties={properties}
        filters={(activeView?.config.filters as FilterCondition[] | undefined) ?? []}
        onChange={onSetFilters}
      />
      <SortControl
        key={`sorts-${activeViewId}`}
        properties={properties}
        sorts={(activeView?.config.sorts as SortCondition[] | undefined) ?? []}
        onChange={onSetSorts}
      />
    </div>
  );
}

interface ActiveDatabaseViewProps {
  activeView: DatabaseViewRecord | null;
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  valueIndex: Map<string, Map<string, unknown>>;
  getValue: (rowId: string, propertyId: string) => unknown;
  onSetValue: (rowId: string, propertyId: string, value: unknown) => void;
  onTitleChange: (rowId: string, title: string) => void;
  onCreateOption: (propertyId: string, name: string) => Promise<SelectOption>;
  onAddRow: () => void;
  onOpenRow: (rowId: string) => void;
  onRenameProperty: (propertyId: string, name: string) => void;
  onDeleteProperty: (propertyId: string) => void;
  members: WorkspaceMemberOption[];
  workspaceId: string;
  editable: boolean;
}

function ActiveDatabaseView(props: ActiveDatabaseViewProps) {
  const { activeView } = props;
  const sharedProps = {
    rows: props.rows,
    onAddRow: props.onAddRow,
    onOpenRow: props.onOpenRow,
    editable: props.editable,
  };

  switch (activeView?.type) {
    case "board":
      return (
        <BoardView
          {...sharedProps}
          properties={props.properties}
          valueIndex={props.valueIndex}
          onSetValue={props.onSetValue}
          groupByPropertyId={(activeView.config.groupByPropertyId as string | null) ?? null}
          members={props.members}
          workspaceId={props.workspaceId}
        />
      );
    case "calendar":
      return (
        <CalendarView
          rows={props.rows}
          getValue={props.getValue}
          datePropertyId={(activeView.config.datePropertyId as string | null) ?? null}
          onOpenRow={props.onOpenRow}
        />
      );
    case "list":
      return <ListView {...sharedProps} />;
    default:
      return (
        <TableView
          {...sharedProps}
          properties={props.properties}
          valueIndex={props.valueIndex}
          onSetValue={props.onSetValue}
          onTitleChange={props.onTitleChange}
          onCreateOption={props.onCreateOption}
          onRenameProperty={props.onRenameProperty}
          onDeleteProperty={props.onDeleteProperty}
          members={props.members}
          workspaceId={props.workspaceId}
        />
      );
  }
}

export function DatabaseView({
  workspaceId,
  workspaceSlug,
  databasePageId,
  editable,
  initialProperties,
  initialRows,
  initialValues,
  initialViews,
  members,
}: DatabaseViewProps) {
  const router = useRouter();
  const [properties, setProperties] = React.useState(initialProperties);
  const [rows, setRows] = React.useState(initialRows);
  const [valueIndex, setValueIndex] = React.useState(() => indexValues(initialValues));
  const [views, setViews] = React.useState(initialViews);
  const [activeViewId, setActiveViewId] = React.useState(initialViews[0]?.id ?? null);
  const activeView = views.find((v) => v.id === activeViewId) ?? views[0] ?? null;

  function getValue(rowId: string, propertyId: string) {
    return valueIndex.get(rowId)?.get(propertyId) ?? null;
  }

  // useCallback below (not just for Table/BoardView's convenience, but because it's
  // required for correctness): TableRow/BoardCard are React.memo'd per-row, and a
  // callback prop recreated on every DatabaseView render would defeat that memoization
  // for every row on every render, regardless of whether that row's own data changed.
  const handleSetValue = React.useCallback(async (rowId: string, propertyId: string, value: unknown) => {
    setValueIndex((prev) => {
      const next = new Map(prev);
      const rowMap = new Map(next.get(rowId));
      rowMap.set(propertyId, value);
      next.set(rowId, rowMap);
      return next;
    });
    const result = await setRowValueAction({ rowPageId: rowId, propertyId, value });
    if (!result.ok) toast.error(result.error);
  }, []);

  const handleTitleChange = React.useCallback(async (rowId: string, title: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, title } : r)));
    const result = await updatePageTitleAction({ pageId: rowId, title });
    if (!result.ok) toast.error(result.error);
  }, []);

  // Depends on `properties` (needs the current option list to pick the next color) so
  // it's only as stable as the properties list itself — still a real win, since editing
  // rows/values (the hot path) doesn't touch `properties` and so doesn't invalidate this.
  const handleCreateOption = React.useCallback(
    async (propertyId: string, name: string): Promise<SelectOption> => {
      const property = properties.find((p) => p.id === propertyId)!;
      const existing = property.config.options as SelectOption[] | undefined;
      const option: SelectOption = {
        id: crypto.randomUUID(),
        name,
        color: nextOptionColor(existing ?? []),
        // A status property's options are grouped/colored by category (todo/in
        // progress/complete — see contracts/databases.ts); a hand-added stage defaults
        // to "in_progress" since that's what people actually add beyond the two seeded
        // anchors (an extra review/blocked/QA step), not another start or end state.
        ...(property.type === "status" ? { category: "in_progress" as const } : {}),
      };
      const nextConfig = { ...property.config, options: [...(existing ?? []), option] };
      setProperties((prev) => prev.map((p) => (p.id === propertyId ? { ...p, config: nextConfig } : p)));
      const result = await updatePropertyAction({ propertyId, config: nextConfig });
      if (!result.ok) toast.error(result.error);
      return option;
    },
    [properties],
  );

  const handleAddRow = React.useCallback(async () => {
    const result = await createRowAction(databasePageId, workspaceId);
    if (!result.ok) return toast.error(result.error);
    setRows((prev) => [...prev, { id: result.value.id, title: "", icon: null, sortKey: result.value.sortKey }]);
  }, [databasePageId, workspaceId]);

  async function handleAddProperty(name: string, type: DatabaseProperty["type"]) {
    const result = await createPropertyAction({ databasePageId, name, type });
    if (!result.ok) return toast.error(result.error);
    setProperties((prev) => [...prev, result.value as DatabaseProperty]);
  }

  const handleRenameProperty = React.useCallback(async (propertyId: string, name: string) => {
    setProperties((prev) => prev.map((p) => (p.id === propertyId ? { ...p, name } : p)));
    const result = await updatePropertyAction({ propertyId, name });
    if (!result.ok) toast.error(result.error);
  }, []);

  const handleDeleteProperty = React.useCallback(async (propertyId: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    const result = await deletePropertyAction({ propertyId });
    if (!result.ok) toast.error(result.error);
  }, []);

  async function handleAddView(type: DatabaseViewRecord["type"]) {
    const names = { table: "Table", board: "Board", list: "List", calendar: "Calendar" } as const;
    const result = await createViewAction({ databasePageId, name: names[type], type });
    if (!result.ok) return toast.error(result.error);
    setViews((prev) => [...prev, result.value as DatabaseViewRecord]);
    setActiveViewId(result.value!.id);
  }

  async function handleSetGroupBy(propertyId: string | null) {
    await patchViewConfig({ groupByPropertyId: propertyId });
  }

  async function handleSetDateProperty(propertyId: string | null) {
    await patchViewConfig({ datePropertyId: propertyId });
  }

  async function handleSetFilters(filters: FilterCondition[]) {
    await patchViewConfig({ filters });
  }

  async function handleSetSorts(sorts: SortCondition[]) {
    await patchViewConfig({ sorts });
  }

  // The server merges a config patch into the view's existing config (see updateView in
  // server/databases/views.ts), so callers only send the field(s) that changed —
  // sidestepping the strict Zod shape for fields a given patch never touches.
  async function patchViewConfig(patch: Record<string, unknown>) {
    if (!activeView) return;
    setViews((prev) => prev.map((v) => (v.id === activeView.id ? { ...v, config: { ...v.config, ...patch } } : v)));
    const result = await updateViewAction({ viewId: activeView.id, config: patch });
    if (!result.ok) toast.error(result.error);
  }

  const openRow = React.useCallback(
    (rowId: string) => {
      router.push(`/w/${workspaceSlug}/p/${rowId}`);
    },
    [router, workspaceSlug],
  );

  const visibleRows = React.useMemo(() => {
    const filters = (activeView?.config.filters as FilterCondition[] | undefined) ?? [];
    const sorts = (activeView?.config.sorts as SortCondition[] | undefined) ?? [];
    return sortRows(filterRows(rows, getValue, filters), getValue, sorts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, valueIndex, activeView?.config.filters, activeView?.config.sorts]);

  return (
    <div className="mx-auto max-w-full px-8 py-6">
      <DatabaseViewTabs
        views={views}
        activeViewId={activeView?.id}
        editable={editable}
        onSelect={setActiveViewId}
        onAdd={handleAddView}
      />
      <DatabaseViewControls
        activeView={activeView}
        activeViewId={activeViewId}
        properties={properties}
        editable={editable}
        onSetGroupBy={handleSetGroupBy}
        onSetDateProperty={handleSetDateProperty}
        onSetFilters={handleSetFilters}
        onSetSorts={handleSetSorts}
      />
      <ActiveDatabaseView
        activeView={activeView}
        properties={properties}
        rows={visibleRows}
        valueIndex={valueIndex}
        getValue={getValue}
        onSetValue={handleSetValue}
        onTitleChange={handleTitleChange}
        onCreateOption={handleCreateOption}
        onAddRow={handleAddRow}
        onOpenRow={openRow}
        onRenameProperty={handleRenameProperty}
        onDeleteProperty={handleDeleteProperty}
        members={members}
        workspaceId={workspaceId}
        editable={editable}
      />

      {editable && (!activeView || activeView.type === "table") ? (
        <div className="mt-2">
          <NewPropertyButton onAdd={handleAddProperty} />
        </div>
      ) : null}
    </div>
  );
}
