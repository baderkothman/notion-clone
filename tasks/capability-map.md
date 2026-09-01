# Capability Map: Notion Clone (Phase 1)

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

Build order: identity → workspaces → pages → blocks → autosave → sharing → collaboration, search, files (parallel-ready) → comments → databases → history → polish

Each module's contract lives at its dependency boundary in `packages/contracts`. Domain logic lives in `packages/database` (schema + queries) and thin domain services under `apps/web/src/server/<module>`. UI composes these; it does not reimplement authorization.

See `docs/PRODUCT_SPEC.md` for the full spec and `docs/NOTION_PARITY.md` for the feature parity matrix.
