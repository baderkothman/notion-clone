# ADR 0003: Database rows are pages, not a separate entity

## Status
Accepted

## Context
Notion-style databases need rows that can have a title, an icon, comments, sharing, and
full block content (a row can be opened as its own page) — not just a fixed set of typed
properties. A bespoke `rows` table would either duplicate most of what `pages` already
provides, or force every row-related feature (comments, sharing, the editor) to grow a
second code path for "rows" alongside "pages".

## Decision
A database is `pages.type = 'database'`. Its rows are ordinary child pages
(`pages.parentId = <database page id>`). `database_properties` defines the schema;
`database_row_values` holds sparse `(rowPageId, propertyId) → value` entries.

## Consequences
- Rows get comments, sharing, favoriting, the block editor, and history for free — no
  separate implementation needed anywhere in the app.
- Listing a database's rows is a `pages` query filtered by `parentId`
  (`apps/web/src/server/databases/rows.ts`), not a join into a different table shape.
- The tradeoff: a database with many rows means many `pages` rows, which is exactly
  Notion's own model and is what the indexes on `pages(workspace_id, parent_id)` are
  sized for — this wasn't treated as a performance risk worth a different design.
- Property/view configuration (`config` jsonb on `database_properties`/`database_views`)
  is intentionally loosely typed at the schema level (validated by
  `packages/contracts/src/databases.ts`'s Zod schemas at the application boundary
  instead) so new property/view types don't require a migration for every variant.
