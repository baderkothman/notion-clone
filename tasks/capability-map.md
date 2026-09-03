# Capability Map: Notion Clone (Phase 1 + Phase 2)

| Module id | Responsibility | Depends on |
|---|---|---|
| identity | Sign up/in/out, sessions, password reset | — |
| workspaces | Workspace CRUD, membership, roles, invitations | identity |
| pages | Page CRUD, hierarchy, trash, favorites | workspaces |
| blocks | Block-based document content (Tiptap JSON) | pages |
| autosave | Debounced persistence, conflict-safe writes | blocks |
| sharing | Page-level permissions, public links, guests | pages, workspaces |
| collaboration | Real-time co-editing, presence, Yjs rooms | blocks, sharing |
| comments | Threaded/contextual comments, mentions | pages, sharing |
| search | Full-text search over pages/blocks, permission-filtered | pages, sharing |
| databases | Notion-style database properties/rows/views | pages |
| files | Object storage, signed upload/download, image blocks | pages, sharing |
| history | Page revisions/snapshots, restore | blocks |
| calendar *(Phase 2)* | Workspace-level calendar events (CRUD, range queries) — not database rows, see `docs/DATABASE.md` | workspaces |
| google-calendar-integration *(Phase 2)* | OAuth connect/disconnect, token refresh/encryption, two-way sync with Google Calendar | calendar, identity |
| marketing-site *(Phase 2)* | Public landing page (`/`) and About page (`/about`) | — |

Build order: identity → workspaces → pages → blocks → autosave → sharing → collaboration, search, files (parallel-ready) → comments → databases → history → polish → **(Phase 2)** calendar → google-calendar-integration → marketing-site

Each module's contract lives at its dependency boundary in `packages/contracts`. Domain logic lives in `packages/database` (schema + queries) and thin domain services under `apps/web/src/server/<module>`. UI composes these; it does not reimplement authorization.

See `docs/PRODUCT_SPEC.md` for the full spec, `docs/NOTION_PARITY.md` for the feature parity matrix (including the Phase 2 differentiation table), and `docs/ARCHITECTURE.md` for the calendar/Google-sync architecture.
