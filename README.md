# LOREKEEP

<p align="center">
  <img src="public/lorekeep-icon.svg" alt="LOREKEEP logo" width="104" height="104" />
</p>

<p align="center">
  <strong>A quiet, local-first writing archive for video game stories and lore.</strong>
</p>

<p align="center">
  Write chronicles, character notes, world details, and connected stories in a focused desktop workspace. Keep the archive on your device, use it offline, and organize it around the games that inspired it.
</p>

<p align="center">
  <a href="https://lorekeep.pages.dev">Open LOREKEEP</a>
  ·
  <a href="https://github.com/lorekeep-pwa/LOREKEEP">Source repository</a>
</p>

---

## Contents

- [What LOREKEEP is](#what-lorekeep-is)
- [Product principles](#product-principles)
- [Features](#features)
- [Architecture at a glance](#architecture-at-a-glance)
- [Technology stack](#technology-stack)
- [Repository layout](#repository-layout)
- [How the local data model works](#how-the-local-data-model-works)
- [Writing and editor behavior](#writing-and-editor-behavior)
- [Games and cover artwork](#games-and-cover-artwork)
- [Cover API reference](#cover-api-reference)
- [Offline behavior and the PWA](#offline-behavior-and-the-pwa)
- [Privacy and security model](#privacy-and-security-model)
- [Requirements](#requirements)
- [Run the application locally](#run-the-application-locally)
- [Environment variables](#environment-variables)
- [Build and type-check](#build-and-type-check)
- [Deploy to Cloudflare](#deploy-to-cloudflare)
- [Back up and restore the archive](#back-up-and-restore-the-archive)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [Design notes](#design-notes)
- [Contributing](#contributing)
- [License](#license)

## What LOREKEEP is

LOREKEEP is a browser-based writing workspace built for people who keep stories, playthrough chronicles, character dossiers, setting notes, and other game-inspired writing. A game profile can act as a home for related documents, while collections and tags provide additional ways to group material across a library.

The application is a Progressive Web App (PWA). It can be opened as a regular website or installed from a compatible browser as a desktop application. Its core archive is local-first: documents, game records, collections, preferences, revisions, and saved cover images are kept in the browser's IndexedDB database on the current device.

The hosted application does not require an account to write. There is no server-side account database or cloud synchronization layer in the current implementation. The optional cover lookup feature does contact IGDB and SteamGridDB through a small server-side proxy; that service handles search requests and image downloads, while the selected cover is copied into the local archive for future offline use.

LOREKEEP is deliberately a writing tool rather than a game catalog. It does not try to keep a remote library in sync, import a user's game ownership, or decide how a story should be written. Game profiles, relationships, tags, and collections remain under the writer's control.

## Product principles

### Writing stays in the foreground

The editor is designed for long sessions. It keeps the writing canvas central, saves changes quietly, and can temporarily hide surrounding controls. Formatting tools are available without turning the editor into a dense document-management interface.

### The archive belongs to the user

The application stores its working data in IndexedDB in the browser profile where it is being used. The user can export a portable JSON backup and import it later. Opening LOREKEEP on another device does not automatically move or synchronize the first device's database.

### Organization is explicit

Documents can be linked to one game and one collection, and can carry multiple tags. A game is a manually curated profile, not an imported database record. This keeps the archive legible even when external catalog services change or are unavailable.

### Online services are optional to writing

Cover search requires a network connection and configured API credentials on a proxy service. Writing, browsing the local archive, and using already-saved covers do not depend on IGDB or SteamGridDB being reachable.

## Features

### Hub Workspace

The Hub is the starting workspace. It summarizes recent and favorite documents, games, collections, and tags, and provides quick access to common creation and navigation actions. A fresh installation starts with an empty archive; it does not seed example games or sample writing into the database.

### Immersive Editor

The Editor provides a single writing surface with structured text formatting. Its toolbar supports:

- Heading levels 1–3.
- Bold, italic, underline, strikethrough, and inline code.
- Bulleted lists and numbered lists.
- Block quotes and horizontal dividers.
- Undo and redo.
- Optional word and character counts.
- A fullscreen Focus Mode that hides the application chrome while writing.
- A configurable writing width and sans-serif or serif editor typography.
- A setting to turn browser spellcheck on or off; it is off by default.
- A setting to gently recede the top bar, toolbar, and Floating Dock during active typing.
- A document revision history with restore and deletion actions.
- A collapsible heading outline that follows the current section and jumps to headings.
- A side-by-side transcription view with a temporary source pane that preserves visible spaces and line breaks while you retype into the document.
- Document export to Markdown, plain text, JSON, or a print-ready PDF flow.

Content is stored as TipTap/ProseMirror JSON alongside derived plain text and word/character counts. This keeps formatting intact while allowing fast searches over readable text.

### Game library

A game profile can include a title, platform, genre, developer, release year, notes, a cover, and an accent color. The profile can be created manually or populated in part by selecting an external cover result. Games can be edited or removed; deleting a game unlinks its stories while leaving the documents themselves in the archive.

Game profiles can be browsed as a library or opened individually to see their associated documents. The built-in platform and genre values are defined in `src/types/models.ts` and are intended as convenient starting categories rather than an exhaustive taxonomy.

Each game profile also has a playthrough journal for recording sessions, missions, or chapters. Entries can include a date and notes, and minor or major spoiler labels hide the entry title and details until explicitly revealed. Session notes are local to the browser archive and are included in workspace backups.

### Collections and tags

Collections are named groups with an optional description and color. Tags are lightweight labels attached to documents. A document can belong to a collection and game at the same time and can have multiple tags. The Collections view supports browsing and filtering by collection or tag and can create documents in the current organizational context.

### Archive

Archiving a document removes it from the ordinary active-draft flow without deleting its content. Archived documents can be browsed separately and restored. Deleting a document is different: its revision snapshots are removed with it.

### Search and navigation

The compact top bar opens a Command Palette with `Ctrl+K` (or `⌘K` on macOS). It can search document titles and text, games, collections, tags, and available actions. Arrow keys move through results and Enter runs the selected item. The Floating Dock provides persistent navigation between Hub, Editor, Games, Collections, and Archive, plus a quick action for a new document.

### Local backups and individual exports

Settings can export the complete workspace as a versioned JSON file or import a backup in merge or replace mode. The Backup Center records the last full export and offers an in-app monthly reminder by default, with weekly and disabled options. The Hub surfaces a reminder when a backup is due and the archive contains data. Individual documents can be exported separately. A full workspace backup includes documents, games, collections, revisions, playthrough session notes, and settings; game cover data is included because the image is stored with the game record.

## Architecture at a glance

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Browser / installed PWA                                              │
│                                                                      │
│  React views ── TipTap editor ── Dexie live queries                  │
│       │                         │                                    │
│       └──── cover search client  └──── IndexedDB: lorekeep_local_db  │
└─────────────────┬──────────────────────────────────────────────────┘
                  │ GET /api/covers/* (only for online cover features)
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Cover API proxy                                                      │
│ Local: Vite middleware or Node HTTP server                           │
│ Hosted: Cloudflare Worker                                            │
│                                                                      │
│  Twitch OAuth2 → IGDB (primary)                                      │
│  SteamGridDB (fallback / alternate portrait artwork)                 │
│  Allowlisted image proxy → IGDB and SteamGridDB CDN hosts             │
└─────────────────────────────────────────────────────────────────────┘
```

The frontend and proxy have separate responsibilities:

1. React components render the workspace and translate user actions into database operations.
2. Dexie provides typed access to the browser's IndexedDB stores and live query subscriptions.
3. The cover-search client calls a same-origin `/api/covers` path by default, or a configured Worker base URL in production.
4. The Node proxy is used during local development. The Cloudflare Worker is the hosted API implementation.
5. Provider credentials stay in server-side environment variables or Cloudflare Worker Secrets. They are never intentionally included in the Vite bundle.

## Technology stack

| Area | Technology | Responsibility |
| --- | --- | --- |
| UI | React 19 | Application shell, views, dialogs, and interactive components |
| Language | TypeScript 5 | Model and component contracts; build-time checking |
| Bundler and dev server | Vite 6 | Local development server and production asset build |
| Rich text | TipTap 2 / ProseMirror | Structured editing, formatting, clipboard parsing, and editor history |
| Local database | Dexie 4 | IndexedDB schema, transactions, and convenient typed queries |
| Reactive database hooks | `dexie-react-hooks` | React updates when IndexedDB query results change |
| Icons | `lucide-react` | Consistent outline icon set |
| PWA | `vite-plugin-pwa` / Workbox | Web app manifest, service worker, asset precache, and update registration |
| Cover API (local) | Node.js HTTP server and Vite middleware | Keeps provider secrets outside of browser code during development |
| Cover API (hosted) | Cloudflare Workers | Performs provider requests and proxies approved image hosts |
| Static hosting | Cloudflare Pages | Hosts the compiled PWA and builds from GitHub `main` |

The frontend does not use a remote SQL database, a sign-in provider, an analytics SDK, or an AI API.

## Repository layout

```text
.
├── public/
│   ├── lorekeep-icon.svg       # Product mark and PWA icon
│   ├── _headers                # Static response security/cache headers for Pages
│   └── _redirects              # Pages redirect/rewrite configuration
├── server/
│   ├── cover-api-handler.mjs   # Local proxy implementation and provider adapters
│   └── cover-proxy.mjs         # Standalone local HTTP entry point
├── src/
│   ├── components/             # Shared navigation, dialogs, rows, and controls
│   ├── db/database.ts          # Dexie schema and archive operations
│   ├── services/coverSearch.ts # Browser-side cover API client and mappings
│   ├── styles/                 # Design tokens and global component styling
│   ├── types/models.ts         # Domain model and fixed option lists
│   ├── utils/                  # Formatting, image compression, export/import helpers
│   ├── views/                  # Hub, Editor, Games, Collections, and Archive screens
│   ├── App.tsx                 # Live queries, navigation, and application orchestration
│   └── main.tsx                # React root
├── worker/
│   ├── src/index.ts            # Cloudflare Worker cover API
│   ├── tsconfig.json           # Worker-specific TypeScript configuration
│   └── wrangler.toml           # Worker name, entry point, and runtime settings
├── .env.example                # Names of local environment variables; no secrets
├── DESIGN.md                   # Product interface direction
├── DEPLOY.md                   # Deployment walkthrough
├── PRODUCT.md                  # Product intent, constraints, and scope
├── index.html                  # HTML document shell
├── package.json                # Scripts and dependencies
└── vite.config.ts              # Vite, local API middleware, and PWA configuration
```

### Responsibilities of the main source areas

- `src/App.tsx` composes the active view and global dialogs, subscribes to local archive data with `useLiveQuery`, owns section navigation, and handles global shortcuts.
- `src/db/database.ts` defines the `lorekeep_local_db` database and implements record lifecycle operations, backup import/export assembly, and revision retention.
- `src/types/models.ts` is the canonical place to inspect domain interfaces, default settings, platform values, genre values, and accent swatches.
- `src/views/EditorView.tsx` configures TipTap, handles editor autosave scheduling, provides the formatting ribbon and custom editor context menu, and coordinates revision/export UI.
- `src/components/GameFormModal.tsx` manages game entry, official cover search, selecting alternate art, and local image upload.
- `src/services/coverSearch.ts` turns browser operations into requests to `/api/covers/*` and maps external platforms and genres into the app's fixed option values.
- `server/cover-api-handler.mjs` provides the Node-side counterpart of the Worker for local development.
- `worker/src/index.ts` is the deployed provider proxy. It contains no hard-coded provider keys; the values come from Worker bindings.
- `src/utils/export.ts` serializes editor content to document formats and defines the workspace backup envelope.

## How the local data model works

The current database is named `lorekeep_local_db`. Dexie initializes schema version 2 with six stores:

| Store | Key | Important indexed fields | Purpose |
| --- | --- | --- | --- |
| `documents` | `id` | `title`, `gameId`, `collectionId`, multi-entry `tags`, `isFavorite`, `isArchived`, `updatedAt`, `createdAt` | Writing content and organization metadata |
| `games` | `id` | `title`, `platform`, `genre`, `developer`, `updatedAt`, `createdAt` | Manually managed game profiles and local cover data |
| `collections` | `id` | `name`, `updatedAt`, `createdAt` | Named groups for related documents |
| `revisions` | `id` | `documentId`, `createdAt` | Snapshots of document title, editor JSON, and word count |
| `gameSessions` | `id` | `gameId`, `playedAt`, `updatedAt` | Playthrough journal entries linked to a game profile |
| `settings` | `id` | `id` | A single `user-settings` record |

### Document records

`LoreDocument` includes a stable identifier, title, serialized TipTap JSON, plain text, word count, character count, optional `gameId` and `collectionId`, a string array of tags, favorite/archive flags, and millisecond timestamps. Content JSON is authoritative for formatting; `plainText` is a derived representation used by text search and exports.

New document IDs use `crypto.randomUUID()` where available, with a timestamp/random fallback for environments without it. The editor begins with an empty ProseMirror document and can be associated with a game, collection, or initial tag at creation time.

### Relationships and deletion behavior

- A document may link to one game and one collection, or to neither.
- A document may carry zero or more tags.
- Deleting a game updates documents that referred to it so their `gameId` becomes `null`; the documents remain.
- Deleting a collection similarly clears `collectionId` on its documents.
- Deleting a document removes its revision snapshots in the same IndexedDB transaction.
- Archiving a document changes its archive flag; it does not erase the document.

These operations are local IndexedDB transactions. There is no server-side cascade or cross-device consistency protocol.

### Revision history

Each revision contains the document ID, title, serialized editor content, word count, and creation timestamp. The editor schedules a save after a short pause in typing and creates a quiet snapshot at most once per 90 seconds of active edits when the current content differs from the most recent snapshot. A writer can also create a snapshot manually, inspect saved revisions, restore one, or delete a snapshot. Restoring first records a safety snapshot of the current state when needed. The database retains no more than 40 snapshots per document, dropping the oldest excess records.

### Settings

Settings are stored under the fixed key `user-settings`. On first launch, `ensureSettings()` inserts defaults. Current options include word-count visibility, editor font, writing width, spellcheck, and whether the interface recedes while typing. If the settings row is missing, the UI resolves to the defaults while the database initializes the row.

## Writing and editor behavior

### Structured content and autosave

TipTap is configured with StarterKit, heading levels 1–3, underline, a writing placeholder, and an unlimited character-count extension. There is no artificial character limit in the configured editor.

On each editor update, LOREKEEP reads the editor JSON, extracts plain text, computes word and character totals, updates the visible counters, and stages a save. Saves are debounced by 420 milliseconds, so a continuous stream of keystrokes does not create a database write per character. The save indicator moves between a saving state and a saved state. Pending content is flushed when editor lifecycle events require it.

The default editor attributes disable browser spellcheck, autocorrect, and autocapitalization. Spellcheck can be enabled from Settings. This is useful for proper names and invented terms, but it is still the browser's own spellcheck rather than a LOREKEEP dictionary.

### Clipboard and paragraph normalization

The editor has a custom parser for plain-text clipboard content. It normalizes CRLF/CR line endings, treats one or more blank lines as paragraph boundaries, and joins soft-wrapped lines inside a paragraph with spaces. This is intended to make text copied from sources such as Notepad readable as paragraphs instead of preserving every narrow display line as a separate break. The normal paste path can retain HTML formatting when the browser clipboard grants HTML access; the context menu also offers a plain-text paste action.

Clipboard reads through the custom context menu rely on browser Clipboard API permissions and a secure context. If the browser denies the read, normal keyboard paste remains available. The editor context menu is custom to the writing area; it does not replace the browser's context menu across every part of the website.

### Keyboard shortcuts

| Shortcut | Action | Context |
| --- | --- | --- |
| `Ctrl+K` / `⌘K` | Open or close the Command Palette | Application-wide |
| `Alt+N` | Create a new document | Application-wide |
| `Alt+F` | Toggle Focus Mode | When a document is open in Editor |
| `Escape` | Exit Focus Mode | When Focus Mode is active |
| `Ctrl+B` | Toggle bold | Editor selection |
| `Ctrl+I` | Toggle italic | Editor selection |
| `Ctrl+U` | Toggle underline | Editor selection |
| `Ctrl+Z` | Undo | Editor selection |
| `Ctrl+Y` | Redo | Editor selection |
| `↑` / `↓` | Move through palette results | Command Palette |
| `Enter` | Run the selected palette result | Command Palette |
| `Escape` | Close the active palette/dialog/menu | Context-dependent |

The editor's exact shortcut behavior can also depend on the browser and operating system. Toolbar actions remain available if a key is intercepted by the host environment.

### Focus and adaptive chrome

Focus Mode hides the top navigation and Floating Dock and requests browser fullscreen where supported. If the Fullscreen API is denied, LOREKEEP still applies its in-app focus layout. Press `Alt+F` or `Escape` to leave Focus Mode.

The separate “Dim chrome while typing” preference gently recedes controls during a calm writing interval. It is not the same as Focus Mode: the interface remains present and returns when pointer movement wakes it.

## Games and cover artwork

Game cover search is a convenience layered on top of manual game entry. It does not change the local-first storage model.

### Search sources

- **Auto** queries IGDB first. If IGDB is not configured, is rate-limited, fails, or returns no useful matches, the proxy falls back to SteamGridDB.
- **IGDB** can be selected directly as the requested source.
- **SteamGridDB** can be selected directly for its portrait artwork and alternate images.

Search results include available source metadata such as title, release year, platform names, genre, developer, and edition/category label. Only fields returned by a provider are populated; missing values remain blank for the writer to edit manually.

### Choosing and saving art

The cover picker shows result thumbnails through the proxy. SteamGridDB results can expose alternate portrait artworks. Selecting an image downloads it through the allowlisted image endpoint, compresses/crops it to a 3:4 portrait canvas (600 × 800 pixels), and stores a data URL on the local game record. WebP is preferred when supported, with JPEG as a fallback. This makes a chosen cover available after the network is disconnected.

The user can also upload an image from the computer or remove an existing cover. Uploaded images use the same local compression path. A cover is a local copy; it is not a live reference to the provider's URL.

### Matching and rate limits

The server normalizes titles by removing diacritics, lowercasing, replacing ampersands with “and”, and reducing punctuation and whitespace. It ranks provider names using exact/prefix matches, token overlap, and compact containment, then removes low-scoring candidates. This is a lightweight title matcher rather than a semantic search engine. Editions, regional spellings, remakes, DLC, and similarly named releases may still require the writer to inspect the result before choosing a cover.

The Worker applies a small in-memory per-isolate rate limit: up to four IGDB requests per second and five SteamGridDB requests per second. The limit is intentionally conservative. Cloudflare isolates are ephemeral, so this is not a globally coordinated quota system.

## Cover API reference

All routes use the `/api/covers` prefix. The browser calls the current site origin when `VITE_COVER_API_BASE` is empty. In a hosted deployment, that variable points to the Worker base URL, without a trailing slash.

### `GET /api/covers/status`

Returns whether each upstream is configured. It reports boolean configuration fields and explanatory status text; it must not return any secret values.

Representative response shape:

```json
{
  "igdb": {
    "configured": true,
    "hasClientId": true,
    "hasClientSecret": true,
    "reason": null
  },
  "steamgriddb": {
    "configured": true,
    "reason": null
  }
}
```

### `GET /api/covers/search?q=<title>&source=<mode>`

`q` must contain at least two characters. `source` accepts `auto`, `igdb`, or `steamgriddb`; omitted source defaults to `auto`.

The response contains the submitted query, the active source, whether fallback was used, an optional notice, and a list of normalized results. A result can include an ID, provider ID, source, title, release year, edition label, platform names/families, genre, developer, thumbnail and cover URLs, and optional alternate covers.

The `auto` mode treats IGDB as primary. When it cannot produce usable results, SteamGridDB is attempted and the response identifies the fallback. Explicitly choosing one source does not silently switch to the other source.

### `GET /api/covers/image?url=<https-url>`

Fetches a provider image through the server proxy. Only HTTPS URLs whose hostname is one of the following are accepted:

- `images.igdb.com`
- `cdn.steamgriddb.com`
- `cdn2.steamgriddb.com`

Invalid URLs return `400`; non-allowlisted destinations return `403`; an upstream image failure returns a gateway error. Successful images are returned with their upstream content type when available and a one-day public cache header. The strict host list prevents the endpoint from becoming a general-purpose open proxy.

### Upstream behavior

IGDB requests are sent to `https://api.igdb.com/v4/games`. The proxy obtains a Twitch OAuth2 client-credentials token from `https://id.twitch.tv/oauth2/token`, caches it in memory until shortly before expiration, and retries once after an IGDB `401` with a refreshed token. Requests ask IGDB for title, release date, category, platforms, genres, developer/company, and cover image ID.

SteamGridDB requests use its autocomplete search endpoint followed by the portrait grid endpoint. The API key is sent as a Bearer token from the server. Up to eight candidate games are considered, and a small number of portrait grids per candidate are returned as choices.

### CORS and request handling

The Worker responds to `OPTIONS` preflight requests and permits `GET` and `OPTIONS` only. `ALLOWED_ORIGIN` can be a single origin, a comma-separated list, or `*`. The deployed configuration is intended to use `https://lorekeep.pages.dev`. JSON responses are marked `no-store`; image responses use a one-day cache policy.

## Offline behavior and the PWA

Vite's PWA plugin builds the app shell service worker using Workbox. The worker precaches the generated HTML, JavaScript, CSS, SVG, PNG, ICO, and web manifest assets. Navigation fallback is configured to `/index.html` while excluding `/api/` routes, so API requests are not answered with the SPA document.

The service worker uses `registerType: 'autoUpdate'`. A newly published app build can be picked up by the installed PWA automatically; it does not require a manually managed release prompt in the current configuration. The service worker and registration script are given no-cache response headers in `public/_headers` so clients can discover updates.

Offline support covers the app shell and data already stored by the browser. It does not make upstream search available offline. A selected cover is saved locally, but a game that has no saved cover cannot download one until connectivity returns.

Storage is scoped to the browser's origin and profile. Clearing site data, using a different browser profile, or uninstalling a browser can affect access to the local archive. Export a backup before changing devices or browser profiles.

## Privacy and security model

### What stays on the device

LOREKEEP stores document content, game profiles, collections, tags, revision snapshots, preferences, and locally selected cover data in IndexedDB. The app has no login form and does not upload that archive to a LOREKEEP backend. The workspace backup is generated client-side and downloaded by the browser.

### What leaves the browser for cover lookup

When the writer searches for a cover, the search query is sent to the configured cover proxy and then to the selected provider or providers. The proxy obtains provider image data for display and selection. The archive itself is not part of that request. Once selected, the cover image is downloaded through the proxy and placed into local IndexedDB.

### Secrets

The following credentials are server-only and must never be committed or prefixed with `VITE_`:

- `IGDB_CLIENT_ID`
- `IGDB_CLIENT_SECRET`
- `STEAMGRIDDB_API_KEY`

Use `.env.local` for local Node/Vite proxy development, `worker/.dev.vars` for local Wrangler Worker development, or Cloudflare Worker Secrets for the hosted API. Both local secret files and Wrangler state are excluded by `.gitignore`. `.env.example` lists variable names and safe defaults, not real keys.

`VITE_COVER_API_BASE` is different: it is a public URL compiled into the browser bundle. It is configuration, not a credential. Anyone can inspect the built site and see this URL.

### Browser headers

`public/_headers` sets `X-Content-Type-Options: nosniff`, a strict-origin referrer policy, `X-Frame-Options: DENY`, and a permissions policy disabling camera, microphone, and geolocation. It also defines cache rules for the service worker, manifest, and fingerprinted assets.

## Requirements

- Node.js compatible with the versions supported by the installed Vite toolchain. The hosted build currently runs Node.js 22 and npm 10.
- npm (the repository includes `package-lock.json`; use `npm ci` for a lockfile-based install).
- A modern browser with React, IndexedDB, and service-worker support.
- For cover search in local development, valid provider credentials in a local environment file.
- For hosted cover search, a deployed Worker with its secrets configured and a production Pages variable pointing at the Worker.

The main writing application can be run without any cover API credentials. Only official cover lookup needs them.

## Run the application locally

### 1. Clone and install dependencies

```bash
git clone https://github.com/lorekeep-pwa/LOREKEEP.git
cd LOREKEEP
npm ci
```

### 2. Configure optional local cover credentials

Copy `.env.example` to `.env.local` and add credentials only if you want to use official cover search from the local Vite server:

```dotenv
IGDB_CLIENT_ID=your-twitch-client-id
IGDB_CLIENT_SECRET=your-twitch-client-secret
STEAMGRIDDB_API_KEY=your-steamgriddb-api-key
COVER_PROXY_PORT=8787
```

Keep `.env.local` untracked. Do not put secret values in source files, commit messages, issue descriptions, or frontend variables.

### 3. Start Vite

```bash
npm run dev
```

Vite uses port `5173` and requires that port to be available (`strictPort` is enabled). The configured Vite middleware handles `/api/covers/*` locally, so a separate API process is not required for the usual development flow. Open the local URL printed by Vite.

To run the standalone Node proxy separately, use:

```bash
npm run start:api
```

It listens on `127.0.0.1` using `COVER_PROXY_PORT` (default `8787`). The standalone process is useful when working directly with the API; the frontend's built-in development middleware remains the simplest way to use the UI and proxy together.

### 4. Try the local archive

Create a document from the Hub or with `Alt+N`, write a few paragraphs, and navigate to another view. The Editor save status should settle on “Saved.” Data remains in the current browser profile. Add a game manually to explore the library, or configure cover credentials to use the online cover picker.

## Environment variables

| Variable | Required for | Where it belongs | Description |
| --- | --- | --- | --- |
| `IGDB_CLIENT_ID` | IGDB lookups | Local server environment / Worker Secret | Twitch application client ID used by IGDB |
| `IGDB_CLIENT_SECRET` | IGDB lookups | Local server environment / Worker Secret | Twitch OAuth client secret; never expose in the frontend |
| `STEAMGRIDDB_API_KEY` | SteamGridDB lookups | Local server environment / Worker Secret | SteamGridDB Bearer API key |
| `COVER_PROXY_PORT` | Standalone local proxy | `.env.local` | Port for `npm run start:api`; defaults to `8787` |
| `VITE_COVER_API_BASE` | Hosted or separately hosted proxy | Pages build environment | Public base URL used by the frontend for `/api/covers/*`; leave empty for same-origin local Vite middleware |
| `ALLOWED_ORIGIN` | Hosted Worker CORS | `worker/wrangler.toml` or Worker variable | Allowed browser origin(s); comma-separate multiple origins |

Vite exposes variables with the `VITE_` prefix to client code at build time. That is why only the non-sensitive Worker URL belongs in `VITE_COVER_API_BASE`; provider keys must remain on the server.

### Wrangler local development

For local Worker execution with Wrangler, create `worker/.dev.vars` and define the three provider secrets there. Wrangler reads that file for local development. It is ignored by Git. Avoid printing it to the terminal or adding it to a commit.

## Build and type-check

Build the frontend for production:

```bash
npm run build
```

The script first runs the TypeScript project build (`tsc -b`) and then creates the optimized Vite bundle in `dist/`. Cloudflare Pages serves that output directory.

Check the Worker TypeScript without deploying it:

```bash
npm run typecheck:worker
```

There is no test script declared in the current `package.json`. The build command is a production compilation step, not a substitute for browser-level behavior checks.

## Deploy to Cloudflare

The deployed application uses Cloudflare Pages for static assets and a separate Cloudflare Worker for provider calls. The application source is in GitHub; the Pages project builds from `main`.

### Current Pages build settings

| Setting | Value |
| --- | --- |
| Pages project | `lorekeep` |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output | `dist` |
| Cover API base | `https://lorekeep-covers-api.mikimiki-dm68.workers.dev` |
| Automatic production deployments | Enabled |
| Automatic preview branch deployments | Disabled |
| Pull request build comments | Disabled |

The public site is [https://lorekeep.pages.dev](https://lorekeep.pages.dev). A push to `main` starts a new production build and deploy. The app-shell service worker is configured to update automatically after a newer release is available.

### Deploy the Worker

Authenticate Wrangler once for the relevant Cloudflare account, then deploy using the repository configuration:

```bash
npx wrangler login
npm run deploy:worker
```

The command is equivalent to:

```bash
npx wrangler deploy --config worker/wrangler.toml
```

The Worker is named `lorekeep-covers-api`, uses `worker/src/index.ts`, and has Workers.dev enabled. `ALLOWED_ORIGIN` is configured for the Pages production origin.

### Configure Worker Secrets

Set each key through the Cloudflare Dashboard or Wrangler. Wrangler prompts for the secret value interactively:

```bash
npx wrangler secret put IGDB_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put IGDB_CLIENT_SECRET --config worker/wrangler.toml
npx wrangler secret put STEAMGRIDDB_API_KEY --config worker/wrangler.toml
```

Do not append secret values to these commands, because command history and process inspection can expose them. Do not use `VITE_` names for provider credentials.

### Configure the Pages cover API variable

In the Pages project, add the production text variable:

```text
VITE_COVER_API_BASE=https://lorekeep-covers-api.mikimiki-dm68.workers.dev
```

This is a public base URL, not a secret. A new Pages build is needed for a changed `VITE_` value to be compiled into the frontend. Preview deployments are disabled in the current project configuration.

### Manual deployment alternative

If the project must be created manually, use the Cloudflare Dashboard's Pages Git integration, select the `lorekeep-pwa/LOREKEEP` repository, and set the build command and output directory shown above. Keep the repository private and scope the Cloudflare GitHub App to the intended repository. Add the public build variable to the production environment and keep provider keys in Worker Secrets.

### Verify a deployment

The Worker status route can confirm which integrations are configured without returning secret contents:

```text
https://lorekeep-covers-api.mikimiki-dm68.workers.dev/api/covers/status
```

For a Pages deployment, check Cloudflare's deployment details for the source repository, branch, commit, and `initialize`, `clone repo`, `build`, and `deploy` stage statuses. A successful Vite build alone does not verify provider credentials or cover search responses.

Cloudflare Pages currently reports the catch-all rule in `public/_redirects` (`/* /index.html 200`) as an infinite loop and ignores that rule. The app still builds and deploys. If direct navigation to nested client routes is added in the future, review the Pages redirect configuration instead of relying on that ignored rule.

## Back up and restore the archive

### Export a full backup

Open Settings and choose **Export backup (.json)**. The exported file uses an envelope similar to:

```json
{
  "app": "LOREKEEP",
  "schemaVersion": 2,
  "exportedAt": "2026-01-01T12:00:00.000Z",
  "data": {
    "games": [],
    "collections": [],
    "documents": [],
    "gameSessions": [],
    "revisions": [],
    "settings": []
  }
}
```

The example is structural; a real backup contains the records from the current browser database. `schemaVersion` identifies the current backup format. The import code checks that the file belongs to LOREKEEP and that its `data` object is present, then imports whichever supported arrays it finds.

### Merge

Merge writes imported records into the existing stores using their IDs. Matching IDs are overwritten by the imported record; new IDs are added. This is useful when combining data, but it is not a semantic deduplication operation: two separately created documents with different IDs remain two documents even when their titles match.

### Replace

Replace clears documents, games, collections, revisions, and game session notes before loading records from the backup in one IndexedDB transaction. Imported settings are applied when present. Older backups without a `gameSessions` array remain importable. Export a fresh backup before replacing an archive that matters to you.

### Individual document exports

| Format | Behavior |
| --- | --- |
| Markdown (`.md`) | Preserves supported headings, text marks, lists, quotes, code blocks, and dividers; includes available game, collection, and tag metadata |
| Text (`.txt`) | Exports the document's plain text with a title and optional metadata |
| JSON (`.json`) | Exports one document with metadata, timestamps, counters, plain text, and structured content |
| PDF | Opens a print-ready document in a hidden frame and invokes the browser print dialog; choose “Save as PDF” in the browser |

## Troubleshooting

### The cover picker says the proxy is unavailable

1. Confirm the device is online.
2. Open the Worker status URL and inspect the boolean configuration flags.
3. Confirm `VITE_COVER_API_BASE` points to the deployed Worker and has no trailing slash.
4. After changing a Pages build variable, trigger a new Pages deployment; the old compiled bundle will not gain new build-time configuration by itself.
5. Confirm the Cloudflare Worker is deployed and `ALLOWED_ORIGIN` includes the Pages origin.

### IGDB is unavailable but SteamGridDB works

IGDB needs both `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET`. The secret must be present in the server environment or Cloudflare Worker Secrets. A status response showing one flag as false identifies which setting is missing without revealing its value. Twitch OAuth or IGDB can also temporarily rate-limit or reject requests.

### SteamGridDB has no result

Confirm the `STEAMGRIDDB_API_KEY` Worker Secret is set. Try a shorter or canonical game title, or explicitly choose IGDB in the source selector. Search matching is title-oriented, so a subtitle or regional title may rank differently from a base-game title.

### The cover appears online but disappears offline

Only a cover that has been selected and saved to a game profile is copied into IndexedDB. Search thumbnails are remote previews and are not automatically archived. Select the desired artwork and wait for the save operation to complete before disconnecting.

### Clipboard paste behaves differently by source

Plain text paste normalizes soft-wrapped lines and blank-line paragraph breaks. Rich HTML paste can retain supported formatting when the browser exposes `text/html`. Clipboard access may require a secure origin and browser permission. If the custom context-menu paste action is unavailable, use `Ctrl+V` or `⌘V`.

### Local edits are not visible on another computer

This is expected. The current application does not sync IndexedDB between devices. Export a JSON backup from one device and import it on the other. Keep a separate copy of important backups outside the browser profile.

### A PWA installation still displays an older version

Confirm Cloudflare Pages has a successful recent production deployment, then reopen the application or allow the service worker's automatic update cycle to complete. The service worker registration and `/sw.js` are configured with no-cache headers specifically to avoid pinning an old worker. Do not delete browser storage as the first troubleshooting step; that may remove the local archive.

### A document is missing from the Hub

Check whether it was archived, whether a search/filter is active, or whether the user is in a different browser profile or origin. The Hub emphasizes active drafts; the Archive view contains archived records.

## Known limitations

- The archive is local to one browser origin and profile. There is no automatic sync, user account, or server-side recovery.
- The cover proxy is online-only; status checks and provider searches need network access.
- The built-in cover title matcher is heuristic. Users should inspect the title, year, and edition before choosing artwork.
- Provider metadata is incomplete or inconsistent for some games, platforms, and editions; game fields remain editable after selection.
- Rate limits in the Worker are isolate-local and are not a global quota manager.
- The PWA caches the application shell, not the results of every API request.
- PDF export uses the browser print flow, so final pagination and available PDF options depend on the browser.
- `npm run build` compiles the project but there is no dedicated automated test script in `package.json` at this time.

## Design notes

LOREKEEP uses a neutral, layered dark interface with a restrained indigo accent. The layout avoids a permanently open sidebar: a compact top bar provides context, search, and settings, while a floating dock handles primary navigation. The editor can narrow the surrounding UI further when the user chooses Focus Mode or begins an uninterrupted writing interval.

The design intent and product scope are documented in [DESIGN.md](DESIGN.md) and [PRODUCT.md](PRODUCT.md). Deployment-specific details are kept in [DEPLOY.md](DEPLOY.md) so the operating instructions can evolve without crowding the product overview.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request. The short version is: keep the archive local-first, protect user data and provider credentials, preserve existing backups when changing storage, and explain how a change was checked.

The project currently uses `main` as its production deployment branch. Pull request previews and build-status comments are disabled in Cloudflare Pages.

## Community standards and security

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

LOREKEEP is distributed under the [MIT License](LICENSE). You may use, modify, and redistribute the software under the terms in that file; the license text governs if this summary differs from it.
