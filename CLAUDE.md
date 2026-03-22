# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeepRoot is a personal knowledge base tool built around "recursive deep learning" — users highlight text in notes to ask AI questions, save AI answers as child notes, and continue questioning recursively, forming a growing knowledge tree. All user data is stored locally in the browser via IndexedDB.

## Commands

- `npm run dev` — Start dev server with Turbopack on port 3000
- `npm run build` — Production build (may need `NODE_OPTIONS=--max-old-space-size=4096` on low-memory machines)
- `npm run lint` — ESLint via Next.js
- `npx tsc --noEmit` — Type check without emitting

## Architecture

**Stack**: Next.js 15 (App Router), React 19, Tailwind CSS v4, Tiptap v3, IndexedDB (`idb`), ReactFlow, MiniSearch.

**Key design decisions**:
- **Client-first**: All data (notes, tags, chat sessions, embeddings) stored in browser IndexedDB. No backend database.
- **API proxy only**: The sole server-side code is `src/app/api/chat/route.ts`, which proxies requests to 智谱 AI GLM API and streams SSE responses. This hides `ZHIPU_API_KEY` from the client.
- **HTML storage**: Note content is stored as HTML (Tiptap output), not Markdown. Conversion to Markdown happens only on export.
- **Local RAG**: `@xenova/transformers` runs in the browser for embedding. Vectors stored in IndexedDB.

**Data flow for core interaction (highlight → ask AI → save as note)**:
1. User selects text in `NoteEditor` → `SelectionMenu` appears
2. Click "向 AI 提问" → `AISidebarContext.openSidebar()` with selected text + note context
3. `AISidebar` sends POST to `/api/chat` → Route Handler calls GLM API with SSE streaming
4. User clicks "存为笔记" → `createNote()` with `parentId` set to current note
5. `window.dispatchEvent("tags-updated")` triggers sidebar tag refresh

**State management**: `AISidebarContext` (React Context) is the only global state. Everything else is local component state + IndexedDB reads.

## Key Modules

| Path | Purpose |
|------|---------|
| `src/lib/db.ts` | IndexedDB schema (v2), all CRUD operations. Manages note parent-child relationships and tag reference counting. |
| `src/lib/search.ts` | MiniSearch wrapper with Chinese tokenization. Lazily built, invalidated on note save via `invalidateSearchIndex()`. |
| `src/lib/rag.ts` | Browser-side embedding with `@xenova/transformers`. Chunks text ~300 chars, cosine similarity search. |
| `src/lib/export.ts` | HTML→Markdown conversion, single note export (.md), full library export (.zip with images). |
| `src/app/api/chat/route.ts` | SSE proxy to GLM API. Returns mock response when `ZHIPU_API_KEY` is missing. |

## Non-Obvious Patterns

- **Note links** use `[[` trigger in the editor, stored as `<span data-note-link="noteId">` in HTML. These also create edges in the knowledge tree visualization.
- **Tag counts** use reference counting in the tags store, recalculated via `recalculateTagCounts()` when needed.
- **Search index** is rebuilt lazily on first search after invalidation — not on every save.
- **`tags-updated` event**: A custom DOM event used to coordinate tag refresh across components (Sidebar listens, note pages dispatch).
- **Tiptap v3**: No `BubbleMenu` export — custom `SelectionMenu` component replaces it using `window.getSelection()`.
- **PDF worker**: `public/pdf.worker.min.mjs` is a local copy from pdfjs-dist to avoid COEP issues.
- **`immediatelyRender: false`** on `useEditor` is required to prevent SSR hydration errors with Tiptap.
- **`creatingRef`** guard in `notes/[id]/page.tsx` prevents double note creation in React strict mode.

## Styling

Theme colors are defined in `src/app/globals.css` under `@theme`. Primary color is deep green (`#166534`). Use Tailwind's `text-primary`, `bg-primary`, etc. — do not hardcode color values in components.

## Environment

- `ZHIPU_API_KEY` in `.env.local` (or Vercel env vars for production)
- COEP/COOP headers in `next.config.ts` for WASM support
- `vercel.json` sets 60s function timeout for streaming AI responses

## Language

All UI text and user-facing content must be in Chinese (中文).
