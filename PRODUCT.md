# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Vite, TipTap, IndexedDB with Dexie.js, Lucide (`lucide-react`), and `vite-plugin-pwa`. Explicitly specified by the user.

## Users

PC and console video game enthusiasts and writers who draft stories, tales, character dossiers, and lore notes inspired by modern PC and console games during regular daily desktop sessions.

## Product Purpose

Provide a dedicated, Local-First desktop PWA writing workspace tailored to video game storytelling and note-taking. Success means writing feels immediate, calm, and uninterrupted; games serve as rich, manually curated homes for related stories; and every piece of content stays safely stored locally on the user's PC with offline access.

## Positioning

Unlike generic note-taking apps built around permanent multi-pane sidebars, cloud lock-in, subscriptions, or AI writing features, LOREKEEP pairs a Hybrid Floating Workspace with an Immersive Editor and manual game-world archiving—completely local-first, offline-ready, ad-free, account-free, and AI-free.

## Operating Context

- Primary device: PC desktop browser / installed PWA, typically used in focused solo sessions (often in low-light or evening environments).
- UI language: English.
- Default entry screen: **Hub Workspace** (clean overview of recent drafts, favorites, and quick access to games).
- Initial database state: completely empty archive on first run, with clean, actionable empty states rather than preloaded demo entries.
- Navigation model: **Hybrid Floating Workspace** — compact top navbar (search trigger + settings), adaptive bottom Floating Dock for section navigation, and a `Ctrl + K` Command Palette; no always-visible traditional sidebar; the layout adapts to the active section.

## Capabilities and Constraints

### Confirmed v1 Scope (First Interactive Version)
- Complete Hybrid Floating Workspace UI (compact top bar, bottom Floating Dock, `Ctrl + K` Command Palette, adaptive views).
- Hub Workspace with recent drafts, favorites, quick-create actions, and game shortcuts, starting from an empty archive with clean empty states.
- Immersive Editor powered by TipTap: wide distraction-free writing canvas, no artificial character limits, rich formatting (headings, bold/italic/underline/strike, bullet & ordered lists, blockquotes, horizontal rules, code/inline code), silent local autosave to IndexedDB, optional word and character counter, and fullscreen Focus Mode; zero popups, forced autocorrect, or writing interruptions.
- Collapsible editor outline generated from document headings, with the active heading tracked and direct navigation to each section.
- Side-by-side transcription mode with a session-only reference pane, preserving visible source whitespace and keeping the reference out of the document and its backups.
- Manual Game Archive: create, edit, and delete game profiles with title, customizable cover (local image upload / custom cover visual), platform, genre, developer, and associated stories—zero external API dependencies.
- Per-game playthrough journal for dated session, mission, and chapter notes, including spoiler protection and local backup support.
- Document lifecycle & organization: create, rename, duplicate, delete, archive, favorite; custom collections, tags, and instant local search across documents, games, collections, and tags.
- Real Local-First persistence via IndexedDB (Dexie.js).
- Full workspace backup center with last-export tracking and configurable in-app reminders (monthly by default).
- Device-local appearance setting with the default Slate theme and an accessible warm Paper theme.

### Planned Phase 2 Scope (After v1 Feedback)
- Document revision history (snapshots, diff/inspection, restore).
- Backup & export suite in JSON, TXT, Markdown, and PDF.
- Full offline PWA service worker & installability hardening via `vite-plugin-pwa`.

### Hard Non-Negotiable Constraints
- Strictly no AI features.
- No advertisements, subscriptions, telemetry, or mandatory accounts/registration.
- No external game database API dependencies.
- Real working functionality over aesthetic-only demos.

## Brand Commitments

- Name: **LOREKEEP**.
- Aesthetic direction confirmed by user: **Standard Dark Desktop** — neutral layered dark slate (`#14151A`, `#191B22`, `#1E2029`) with crisp Discord-inspired visual cleanliness (subtle elevation, refined borders, uncluttered states) without copying Discord's layout, paired with a disciplined indigo-blue primary accent (`#5B6EF5`).

## Evidence on Hand

- Greenfield project in `c:\Users\Admin\Downloads\LOREKEEP`. No pre-existing code, brand assets, or user content.
- Starts with an empty local archive by user decision; no synthetic sample documents or games should be pre-seeded into the database.

## Product Principles

1. **Writing Above Everything**: The Immersive Editor commands the space with zero modal clutter, zero forced corrections, and quiet autosave.
2. **Adaptive, Never Crowded**: Chrome recedes when writing and surfaces cleanly when navigating via the Floating Dock and `Ctrl + K`.
3. **Local-First Sovereignty**: Every word, game card, and cover image lives directly on the user's PC in IndexedDB.
4. **Manual Curation Over Automation**: Users craft their own game shelves, covers, tags, and collections without external API noise or AI intrusion.
5. **Earned Familiarity**: Standard, ultra-responsive desktop interactions paired with a calm, cohesive dark identity built for daily use.
