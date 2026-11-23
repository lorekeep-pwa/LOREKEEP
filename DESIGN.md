---
name: LOREKEEP
description: Standard Dark Desktop writing sanctuary and Hybrid Floating Workspace for PC and console video game storytelling.
colors:
  accent: "#5b6ef5"
  accent-fill: "#4b5ee8"
  accent-hover: "#5668ee"
  accent-active: "#4153db"
  accent-soft: "rgba(91, 110, 245, 0.14)"
  accent-border: "rgba(91, 110, 245, 0.42)"
  accent-ink: "#ffffff"
  bg-recessed: "#101116"
  bg-canvas: "#14151a"
  bg-topbar: "#181a21"
  bg-surface: "#1c1e26"
  bg-elevated: "#222530"
  bg-interactive: "#272b37"
  bg-interactive-hover: "#2f3443"
  bg-active: "#343a4c"
  border-subtle: "rgba(255, 255, 255, 0.068)"
  border-default: "rgba(255, 255, 255, 0.105)"
  border-strong: "rgba(255, 255, 255, 0.17)"
  ink-primary: "#f2f3f5"
  ink-secondary: "#c4c9d1"
  ink-muted: "#949ba4"
  ink-dim: "#7f8691"
  state-success: "#45b36b"
  state-favorite: "#e6b450"
  state-danger: "#e25757"
  state-danger-soft: "rgba(226, 87, 87, 0.14)"
typography:
  display:
    fontFamily: "'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0em"
  body:
    fontFamily: "'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
  prose-sans:
    fontFamily: "'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.78
    letterSpacing: "0em"
  prose-serif:
    fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.82
    letterSpacing: "0em"
  label:
    fontFamily: "'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0em"
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0em"
    fontFeature: "'tnum'"
rounded:
  xs: "6px"
  sm: "8px"
  md: "11px"
  lg: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "24px"
  2xl: "36px"
  topbar-height: "56px"
  dock-clearance: "108px"
  container-max: "1100px"
components:
  button-primary:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    height: "38px"
    padding: "0 15px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.accent-ink}"
  button-primary-active:
    backgroundColor: "{colors.accent-active}"
    textColor: "{colors.accent-ink}"
  button-secondary:
    backgroundColor: "{colors.bg-interactive}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.sm}"
    height: "38px"
    padding: "0 15px"
  button-secondary-hover:
    backgroundColor: "{colors.bg-interactive-hover}"
    textColor: "{colors.ink-primary}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    height: "38px"
    padding: "0 15px"
  button-ghost-hover:
    backgroundColor: "{colors.bg-interactive}"
    textColor: "{colors.ink-primary}"
  button-danger:
    backgroundColor: "{colors.state-danger-soft}"
    textColor: "#f38b8b"
    rounded: "{rounded.sm}"
    height: "38px"
    padding: "0 15px"
  input-field:
    backgroundColor: "{colors.bg-recessed}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.sm}"
    height: "38px"
    padding: "0 12px"
  panel-surface:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "22px 24px"
  filter-pill:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    height: "32px"
    padding: "0 12px"
  filter-pill-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "#cdd6ff"
  dock-capsule:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.ink-muted}"
    rounded: "16px"
    padding: "6px"
  dock-item-active:
    backgroundColor: "{colors.bg-active}"
    textColor: "{colors.ink-primary}"
    rounded: "10px"
    height: "40px"
    padding: "0 14px"
  kbd-cap:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.mono}"
    rounded: "5px"
    padding: "4px 6px"
---

# Design System: LOREKEEP

## Overview

**Creative North Star: "The Quiet Dark Desk"**

LOREKEEP is a local-first desktop writing sanctuary built around a Standard Dark Desktop visual system and a Hybrid Floating Workspace. Instead of trapping the writer inside permanent multi-pane sidebars, dense tool drawers, or neon gaming chrome, the interface layers calm neutral dark slate surfaces separated by crisp 1px translucent hairlines and holds a single disciplined indigo accent in reserve for primary actions, active navigation, and keyboard focus.

The density adapts to the task in front of the writer. Management views (Hub Workspace, Games Library, Collections & Tags, Archive) organize content in clean, generous 1100px stages with linear hover-elevated document rows and 3:4 box-art game cards; once inside the Immersive Editor, navigation chrome recedes quietly on typing activity and disappears completely in fullscreen Focus Mode so prose commands the entire viewport.

Confirmed visual rejections from the product and built surface: no permanent left or right navigation sidebars, no neon RGB gamer glows or hard offset shadows, no AI assistant badges or promotional banners, no browser-white flash or unstyled light OS form popups, and no uppercase eyebrow kickers above section headings.

**Key Characteristics:**
- Eight-step neutral dark slate tonal ladder from recessed inputs (`#101116`) to active Floating Dock state (`#343a4c`), separated by 1px white-alpha hairlines.
- Disciplined indigo primary accent (`#5b6ef5` for indicators and focus; deepened `#4b5ee8` fill for WCAG AA >= 4.5:1 white button labels).
- Hybrid Floating Workspace: 56px frosted top bar, centered 1100px viewport, bottom floating capsule Dock 20px above the floor, and `Ctrl + K` Command Palette.
- Readable Figtree sans UI and prose paired with optional Source Serif 4 long-form editor voice and JetBrains Mono strictly for keyboard caps and tabular counters.
- Adaptive chrome recession during continuous typing (top bar, ribbon, meta strip, and dock fade back gently and wake immediately on pointer move, hover, or keyboard focus).
- Theme-aware browser surface styling for caret, text selection, focus rings, scrollbars, form controls, and portaled custom dropdowns; Slate remains the default PWA launch theme.

## Colors

LOREKEEP pairs an eight-step neutral cool-slate tonal hierarchy with a single disciplined indigo accent and restrained semantic state hues; the built `src/styles/tokens.css` expands the initial three-tone slate brief (`#14151A`, `#191B22`, `#1E2029`) into eight calibrated luminance steps plus a contrast-hardened primary button fill.

### Color Themes
**Slate** is the default dark workspace. **Paper** is an optional warm light palette selected in Settings. Both themes use the same semantic tokens and layout; the choice is stored in local settings and included in workspace backups. Theme previews are small renderings of actual interface surfaces rather than decorative swatches. Browser-controlled surfaces and the editor canvas follow the selected theme, while the install splash uses the default Slate colors.

### Primary
- **Disciplined Indigo** (`--accent`, `#5b6ef5`): Keyboard focus outlines (`:focus-visible`), active Floating Dock bottom indicator bar, active-document dot on the Editor dock tab, editor blockquote left accent rule, active `SelectField` checkmarks, panel header icons, and toggle switches in the `on` state.
- **Accessible Indigo Fill** (`--accent-fill`, `#4b5ee8`): Solid background fill for primary action buttons (`.lk-btn-primary`) and the Floating Dock `+ Write` CTA (`.lk-dock-cta`), darkened from `#5b6ef5` so pure white button labels (`--accent-ink`, `#ffffff`) exceed WCAG AA 4.5:1 contrast.
- **Indigo Fill Hover** (`--accent-hover`, `#5668ee`) & **Active** (`--accent-active`, `#4153db`): Tactile hover brightening and pressed deepening on primary CTAs.
- **Indigo Soft Wash** (`--accent-soft`, `rgba(91, 110, 245, 0.14)`) & **Indigo Border** (`--accent-border`, `rgba(91, 110, 245, 0.42)`): Active formatting toolbar toggles, active filter pills, active icon buttons, and selected collection cards (with light indigo tint inks `#cdd6ff` / `#b7c2ff` / `#aebaff` used on dark washes for legibility).

### Neutral
- **Recessed Slate** (`--bg-recessed`, `#101116`): Sunken wells that invite input or hold secondary metadata—text inputs, textareas, custom select triggers, top bar search trigger, toggle tracks, segmented control troughs, Settings storage summary box, and fenced prose code blocks.
- **Deep Slate Canvas** (`--bg-canvas`, `#14151a`): Root application backdrop, fullscreen Focus Mode backdrop, and PWA manifest `theme_color` / `background_color`.
- **Topbar Slate** (`--bg-topbar`, `#181a21`): Sticky top navbar (`rgba(24, 26, 33, 0.88)` with blur) and modal/Command Palette footer strips.
- **Panel Slate** (`--bg-surface`, `#1c1e26`): Primary elevated containers—Hub panels, game cards, collection cards, modals, Command Palette frame, filter pills at rest, and the Floating Dock capsule (`rgba(28, 30, 38, 0.92)` with blur).
- **Elevated Slate** (`--bg-elevated`, `#222530`): Second-tier surfaces sitting above panels—hovered document rows, portaled `SelectField` menus, toast notifications, keyboard shortcut caps, count pills, empty-state icon tiles, game spec pills, and inline prose `<code>`.
- **Interactive Slate** (`--bg-interactive`, `#272b37`): Secondary buttons at rest, hovered ghost/icon/dock controls, selected Command Palette rows, and inline document metadata chips.
- **Interactive Hover Slate** (`--bg-interactive-hover`, `#2f3443`): Hover fill for secondary buttons, highlighted options in `SelectField` menus, and active segments in segmented controls.
- **Active Dock Slate** (`--bg-active`, `#343a4c`): Selected navigation tab inside the bottom Floating Dock.
- **Hairline Borders** (`--border-subtle` `rgba(255, 255, 255, 0.068)`, `--border-default` `rgba(255, 255, 255, 0.105)`, `--border-strong` `rgba(255, 255, 255, 0.17)`): Three-tier 1px crisp edges separating panels, inputs/dock/modals, and hover/focus-elevated boundaries.
- **Off-White Ink Ladder** (`--ink-primary` `#f2f3f5`, `--ink-secondary` `#c4c9d1`, `--ink-muted` `#949ba4`, `--ink-dim` `#7f8691`): Accessible light-on-dark typography hierarchy (>= 4.5:1 across surface steps), with long-form TipTap prose body softened slightly (`#e6e8ec`) to reduce glare during extended evening sessions.

### Semantic & User Swatches
- **Local Save Success** (`--state-success`, `#45b36b`): Editor `Saved` checkmark, toast confirmation icon, and Local-First IndexedDB indicator in Settings.
- **Favorite Gold** (`--state-favorite`, `#e6b450`): Starred document icons across Document Rows, Editor ribbon, and Command Palette results.
- **Destructive Coral** (`--state-danger`, `#e25757`; `--state-danger-soft`, `rgba(226, 87, 87, 0.14)`): Inline delete confirmation buttons paired with light coral ink (`#f38b8b`, brightening to `#ffffff` on hover) and `rgba(226, 87, 87, 0.35)` border.
- **Curated User Swatches (`ACCENT_SWATCHES`)**: Eight muted-to-balanced colors users can assign manually to game profiles (fallback cover tint and hero wash) and collection dots: Indigo (`#5B6EF5`), Cobalt (`#4A90D9`), Emerald (`#3BA573`), Amber (`#D69E4E`), Coral (`#D96B6B`), Slate Violet (`#8F6CE8`), Teal (`#439EA3`), and Graphite (`#636B7E`).

### Named Rules
**The Deepened CTA Fill Rule.** Use the luminous indigo accent (`#5b6ef5`) for focus outlines, active dock indicators, blockquote bars, and accent icons, but always use the deepened fill (`#4b5ee8`) behind white primary button text to guarantee WCAG AA contrast (>= 4.5:1).

**The Neutral Slate Discipline Rule.** Keep 90%+ of every screen in layered neutral dark slate and off-white ink; reserve indigo for active state, focus, and primary triggers, and confine user-picked cover/collection swatches strictly to small dots, 3:4 cover fallback accents, and subtle hero washes.

## Typography

**Display & UI Font:** Figtree (with `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` fallback; loaded in weights 400, 500, 600, 700, italic 400)
**Editorial Serif Voice (Optional Editor Setting):** Source Serif 4 (with `Georgia, 'Times New Roman', serif` fallback; optical size 8..60, weights 400–700, italic 400)
**Mono Font:** JetBrains Mono (with `ui-monospace, SFMono-Regular, Menlo, monospace` fallback; weights 400, 500)

**Character:** Clean geometric-humanist sans precision for desktop navigation and quick scanning, paired with an opt-in literary serif voice for immersive long-form storytelling and tight tabular monospace strictly for keyboard shortcuts, counters, and code.

### Hierarchy
- **Display** (700, `2.25rem` / `1.75rem` below `640px`, line-height `1.18`, tracking `-0.025em`): Editable document title input at the top of the Immersive Editor canvas (`.lk-editor-title`) and 3:4 fallback game monograms (`2.25rem`, tracking `-0.04em`).
- **Headline** (700, `1.75rem`, line-height `1.2`, tracking `-0.025em`, `text-wrap: balance`): Section page titles (`Hub Workspace`, `Games Library`, `Collections & Tags`, `Archive`, Game Detail title) and TipTap `<h1>` (`1.75rem`, line-height `1.28`).
- **Title** (600–700, `0.9375rem`–`1.05rem`, line-height `1.4`–`1.5`): Panel headings (`.lk-panel-title` `0.9375rem`), document row titles (`0.9375rem`), empty-state headings (`1.05rem`), modal dialog titles (`1.05rem` 700), and TipTap `<h2>` (`1.375rem`) / `<h3>` (`1.125rem`).
- **Body** (400, `0.9375rem`, line-height `1.55`, max `60ch` on page descriptions; `0.875rem` / `1.6` in empty-state copy and `0.835rem` in row excerpts): Supporting UI descriptions and document previews.
- **Prose Sans / Serif** (400, `1.0625rem` / `1.78` in Figtree; `1.125rem` / `1.82` in Source Serif 4): Long-form writing inside TipTap `.ProseMirror`, constrained by configurable column widths (`680px`, `780px`, or `960px`) with `1.05em` paragraph rhythm.
- **Label** (500–600, `0.78rem`–`0.875rem`, line-height `1`–`1.4`): Form labels (`0.8125rem` 600), buttons (`0.875rem` 600 / `0.8125rem` small), Floating Dock tabs (`0.84rem` 600), filter pills (`0.8125rem` 500), and metadata chips (`0.74rem`).
- **Mono** (500, `0.69rem`–`0.75rem`, line-height `1`, `tabular-nums`): Keyboard shortcut caps (`0.69rem`), panel count pills (`0.75rem`), inline prose `<code>` (`0.86em`), and fenced `<pre><code>` (`0.875rem`). Numeric metadata (word counts, dates, release years) also applies `.tabular` (`font-variant-numeric: tabular-nums`).

### Named Rules
**The Mono Boundary Rule.** Reserve JetBrains Mono strictly for keyboard shortcut caps (`.lk-kbd`), tabular count pills, and inline or fenced code inside prose; never use monospace for headings, navigation labels, or body copy.

**The Calm Sentence-Case Rule.** Keep page titles, panel headings, button labels, and Command Palette group headers in sentence case with zero uppercase eyebrow kickers; all-caps tracking is reserved solely for the `LOREKEEP` brand wordmark and 3:4 game cover monograms.

## Layout

LOREKEEP uses a **Hybrid Floating Workspace** shell with zero permanent sidebars:

1. **Sticky Top Navbar (`.lk-topbar`)**: Full-width `56px` (`--topbar-height`) three-column grid (`minmax(0, 1fr) minmax(260px, 400px) auto`, `24px` horizontal padding, `18px` gap) holding the LOREKEEP mark + live section/context breadcrumb on the left, the recessed `Ctrl + K` search trigger centered, and a single bordered Settings icon button on the right.
2. **Adaptive Main Viewport (`.lk-main` / `.lk-page`)**: Centered `1100px` (`--container-max`) page container with `36px 28px 24px` padding and `108px` bottom clearance (`--dock-clearance`) so scrollable lists and grids never collide with the Floating Dock.
   - **Hub Workspace**: Asymmetric two-column grid (`minmax(0, 1.45fr) minmax(0, 1fr)`, `20px` gap)—Recent Writing & Favorites main stage on the left, stacked Games mini-shelf (2-column cover grid, up to 4 titles) and Collections & Tags panel on the right.
   - **Games Library & Detail**: Responsive box-art grid (`repeat(auto-fill, minmax(196px, 1fr))`, `18px` gap) and Game Detail hero (`200px minmax(0, 1fr)`, `28px` gap) above a linked documents panel.
   - **Collections & Tags**: Auto-fill collection card grid (`repeat(auto-fill, minmax(260px, 1fr))`, `14px` gap), wrapping tag filter strip, and filtered document list below.
   - **Immersive Editor**: Full-bleed dark canvas with a slim sticky formatting ribbon (`1080px` inner max-width, `8px 24px` padding) and a centered writing column selectable in Settings: Compact (`680px`), Balanced (`780px`, default), or Wide (`960px`), with generous `44px 28px 180px` padding so the active cursor stays comfortably centered above the bottom edge.
   - **Fullscreen Focus Mode**: Fixed `inset: 0` takeover (`z-index: 80`) hiding TopBar, Floating Dock, and inline metadata strip; the formatting ribbon slides off-screen (`translateY(-72%)`, `opacity: 0`) and reveals smoothly on top-edge hover/focus, while a subtle `opacity: 0.35` exit pill rests at bottom-right (`bottom: 20px; right: 24px`).
3. **Bottom Floating Dock (`.lk-dock-anchor`)**: Centered fixed capsule `20px` above the bottom edge (`z-index: 50`), carrying five primary destinations (`Hub`, `Editor`, `Games`, `Collections`, `Archive`), a 1px vertical separator, and a primary `+ Write` quick-create CTA.

**Spacing Rhythm:** Tight control internals use `4px`–`8px` gaps; row padding and form rows use `12px`–`14px`; panel grids and dialog internals use `20px`–`24px`; page header separation uses `28px`; page top breathing room is `36px`.

**Responsive Breakpoints:**
- **<= 920px (`tablet`)**: TopBar switches to `auto minmax(0, 1fr) auto` with `16px` padding; Hub grid and Game Detail hero stack to single columns; Game Detail hero cover scales down to `150px`.
- **<= 640px (`mobile`)**: Brand wordmark text, section breadcrumb, top bar `Ctrl K` cap, Hub shortcuts strip, and Floating Dock text labels hide cleanly (preserving icon-only Floating Dock with horizontal overflow safety); page padding tightens to `24px 14px 20px`; panels drop to `18px 16px`; document rows and two-column form grids stack vertically; editor title reduces to `1.75rem`.

### Named Rules
**The No-Sidebar Workspace Rule.** All top-level navigation lives in the 56px sticky top bar, the centered bottom Floating Dock, and the `Ctrl + K` Command Palette; every primary viewport reserves `108px` of bottom clearance (`--dock-clearance`) so scrollable content never collides with the floating capsule.

**The Typing-Calm Recession Rule.** During continuous writing inside the Immersive Editor, surrounding chrome dims softly (top bar `0.22`, editor ribbon `0.14`, meta strip `0.25`, Floating Dock `0.28` with a `6px` downward nudge) and wakes cleanly on pointer movement, hover, or focus—or vanishes completely in fullscreen Focus Mode.

## Elevation & Depth

LOREKEEP uses a **hybrid depth model**: static page surfaces rely on neutral slate tonal stepping plus 1px translucent hairline borders rather than drop shadows, while floating navigation chrome, portaled menus, overlays, and lifted interactive cards carry soft, broad dark ambient shadows paired with frosted glass (`backdrop-filter: blur(...)`) on sticky and floating bars.

### Shadow Vocabulary
- **Primary CTA Lift** (`box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3)`): Grounding shadow on solid primary indigo buttons (`.lk-btn-primary`).
- **Medium Ambient Elevation** (`--shadow-md`, `box-shadow: 0 10px 28px rgba(0, 0, 0, 0.38)`): Hover-lifted 3:4 game cards (paired with `translateY(-2px)`), Game Detail hero cover frame, Focus Mode floating exit pill, and toast notifications.
- **Floating Dock Elevation** (`--shadow-dock`, `box-shadow: 0 14px 40px rgba(0, 0, 0, 0.56), 0 1px 0 rgba(255, 255, 255, 0.05) inset`): Deep anchor shadow plus a 1px top inner specular highlight lifting the bottom capsule above scrolling content.
- **Dialog & Menu Elevation** (`--shadow-dialog`, `box-shadow: 0 24px 64px rgba(0, 0, 0, 0.68)`): Modal dialogs (`SettingsModal`, `GameFormModal`), `CommandPalette`, and portaled `SelectField` dropdown menus over dimmed blurred backdrops (`rgba(8, 9, 13, 0.7)` + `blur(6px)`).
- **Input Focus Halo** (`box-shadow: 0 0 0 3px rgba(91, 110, 245, 0.22)`): Soft indigo ring paired with `border-color: var(--accent)` on focused inputs, textareas, and open `SelectField` triggers.

**Motion Grammar:** Every state transition uses a crisp deceleration curve (`--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`) at two durations—`--t-fast` (`140ms`) for hover, press (`translateY(1px)`), border shifts, toggle thumbs, and modal/toast entrance (`lk-pop`: `-6px` slide + `0.985` scale fade), and `--t-base` (`210ms`) for game card lifts, typing-calm opacity recession, and writing width transitions. A global `@media (prefers-reduced-motion: reduce)` rule clamps all durations to `0.01ms`.

### Named Rules
**The Flat-Panels, Lifted-Chrome Rule.** Static content panels rest flat on the canvas via tonal slate contrast and 1px hairline borders without drop shadows; soft dark ambient shadows appear only on floating chrome (Floating Dock, Focus pill, toasts), portaled menus, modal dialogs, primary CTAs, and hover-lifted game cards.

## Shapes

LOREKEEP maintains a crisp, softly rounded desktop silhouette—never sharp brutalist rectangles and never overly bubbly consumer pills on primary containers.

- **Corner Radius Ladder**: Micro controls, small buttons, tag pills, inline selectors, spec badges, and formatting tool buttons use `6px` (`--radius-xs`, with `5px` on `.lk-kbd` and inline code); standard buttons, inputs, icon buttons, and segmented frames use `8px` (`--radius-sm`); document rows, game cards, collection cards, fenced code, toasts, and select menus use `11px` (`--radius-md`); content panels, modals, Command Palette, and Game Detail hero use `14px` (`--radius-lg`); the Floating Dock uses `16px` framing `10px` inner tabs for optical concentricity; filter chips, count badges, switches, and the Focus exit pill use full capsules (`999px`, `--radius-pill`).
- **3:4 Game Box-Art Proportion**: All game covers (`.lk-game-cover` and `.lk-game-hero-cover`) lock strictly to `aspect-ratio: 3 / 4` (`object-fit: cover` for local uploads, or a minimalist fallback with a `32px × 3.5px` accent bar, bold initials monogram, and frosted platform pill).
- **Linear Rows Over Nested Cards**: Document lists inside panels render as transparent full-width rows (`.lk-doc-row`) that adopt `--bg-elevated` and `--border-subtle` only on hover, avoiding heavy card-inside-card boxing.

### Named Rules
**The Concentric Radius Hierarchy Rule.** Step corners progressively outward from nested micro-elements (`5px` kbd caps, `6px` small controls and tags) through standard inputs and buttons (`8px`), cards and rows (`11px`), panels and modals (`14px`), to the Floating Dock capsule (`16px` housing `10px` items) and full pills (`999px`).

## Components

Every component is built for tactile, instant desktop feedback with clear focus visibility and zero modal clutter during writing.

### Buttons
Unified button vocabulary (`38px` default height, `0 15px` padding, `8px` radius, `0.875rem` weight `600`, `1px` active press depression; compact `.lk-btn-sm` variant at `32px` height, `0 11px` padding, `6px` radius, `0.8125rem`).
- **Primary (`.lk-btn-primary`)**: `--accent-fill` (`#4b5ee8`) with `#ffffff` ink and soft grounding shadow; hovers to `--accent-hover` (`#5668ee`), presses to `--accent-active` (`#4153db`). Reserved for the top-level creation or save action in a view or modal.
- **Secondary (`.lk-btn-secondary`)**: `--bg-interactive` (`#272b37`), `--border-default`, `--ink-primary`; hovers to `--bg-interactive-hover` (`#2f3443`) and `--border-strong`.
- **Ghost (`.lk-btn-ghost`)**: Transparent rest state, `--ink-secondary`; reveals `--bg-interactive` and `--ink-primary` on hover.
- **Danger (`.lk-btn-danger`)**: Soft coral wash (`--state-danger-soft`), `rgba(226, 87, 87, 0.35)` border, `#f38b8b` text; intensifies to `rgba(226, 87, 87, 0.24)` and `#ffffff` ink on hover. Used for inline two-step delete confirmations rather than browser alerts.
- **Icon & Tool Buttons (`.lk-icon-btn` `34×34px`, `.lk-tool-btn` `30px` min square)**: Subtle transparent triggers; active toggle states apply `--accent-soft` fill, `--accent-border`, and light indigo ink (`#b7c2ff` / `#cdd6ff`).

### Chips & Pills
- **Filter Pills (`.lk-filter-pill`)**: `32px` height, `0 12px` padding, `999px` radius, `--bg-surface` with `--border-subtle`; active filters switch to `--accent-soft`, `--accent-border`, and `#cdd6ff` ink.
- **Metadata Chips (`.lk-meta-chip`)**: Compact `2px 8px` pill (`--bg-interactive`, `--border-subtle`, `0.74rem`, max `180px` ellipsis) displaying linked game or color-dotted collection inside document rows.
- **Tag Pills (`.lk-tag-pill`)**: Soft indigo tint (`rgba(91, 110, 245, 0.12)`, `#aebaff` ink, `6px` radius, `2px 8px` padding) prefixed with `#`, with an inline `×` remove button inside the editor metadata strip.
- **Count Pills (`.lk-count-pill`) & Spec Pills (`.lk-spec-pill`)**: Monospace tabular counters (`999px` pill, `--bg-elevated`) next to panel headers, and `6px`-radius `--bg-elevated` game metadata badges (platform, genre, developer, year).
- **Keyboard Shortcut Caps (`.lk-kbd`)**: Tactile keycap (`JetBrains Mono`, `0.69rem`, `--bg-elevated`, `5px` radius, subtle brighter bottom border `rgba(255, 255, 255, 0.16)`, `4px 6px` padding).

### Cards & Containers
- **Workspace Panel (`.lk-panel`)**: `--bg-surface` (`#1c1e26`), `1px solid var(--border-subtle)`, `14px` radius, `22px 24px` padding, with a `14px`-padded bottom-bordered header (`.lk-panel-head`).
- **Document Row (`.lk-doc-row`)**: Linear row (`12px 14px` padding, `11px` radius) transitioning from transparent to `--bg-elevated` on hover, revealing full-opacity row actions (favorite, inline rename, duplicate, archive/restore, inline two-step delete).
- **3:4 Game Card (`.lk-game-card`)**: `--bg-surface`, `11px` radius, zero inner padding on the `3:4` cover media, `12px 13px 13px` footer body; lifts `translateY(-2px)` with `--border-strong` and `--shadow-md` on hover.
- **Collection Card (`.lk-collection-card`)**: `--bg-surface`, `11px` radius, `16px 18px` padding; selected filter state switches to `rgba(91, 110, 245, 0.08)` with `--accent-border` and `Active filter` indicator.
- **Empty States (`.lk-empty`)**: Calm left-aligned (inside panels) or centered (standalone views) empty states with a `42×42px` `--bg-elevated` icon tile, concise guidance copy (max `46ch`), and one direct creation button—zero synthetic sample records.

### Inputs & Fields
- **Text Inputs & Textareas (`.lk-input`, `.lk-textarea`)**: Recessed `--bg-recessed` (`#101116`), `1px solid var(--border-default)`, `8px` radius, `38px` input height (`0 12px` padding); hover brightens to `--border-strong`; focus applies `border-color: var(--accent)` and the `3px` indigo halo (`rgba(91, 110, 245, 0.22)`).
- **Custom Portaled Select (`SelectField` / `.lk-select-trigger` & `.lk-select-menu`)**: Replaces native OS `<select>` menus with an accessible `role="combobox"` button (`default` `38px` recessed or `inline` `30px` surface variant) and a `createPortal`-mounted dark listbox (`--bg-elevated`, `--border-strong`, `11px` radius, `--shadow-dialog`, `z-index: 200`) with keyboard navigation, auto-flipping viewport collision math, and an indigo active checkmark.
- **Segmented Controls & Switches (`.lk-segmented`, `.lk-switch`)**: Recessed `--bg-recessed` tracks holding `28px` segment toggles (`--bg-interactive-hover` active pill) or `42×24px` pill switches with an `18px` white thumb sliding `18px` onto `--accent`.
- **Inline Tag Input (`.lk-tag-input`)**: Quiet `28px × 132px` dashed-border field (`--border-default`) inside the editor metadata strip that turns solid `--accent` on focus and commits tags on `Enter`, `,`, or blur.
- **Recovery Code (`.lk-account-recovery-code`)**: A single 64-character hexadecimal value in a recessed, hairline-bordered well using the existing JetBrains Mono token. Keep it selectable and allow wrapping at narrow widths; pair it with an explicit copy action and save acknowledgement. Avoid numbered word grids or decorative security graphics.

### Navigation
- **TopBar (`.lk-topbar`)**: Sticky `56px` frosted slate header (`rgba(24, 26, 33, 0.88)`, `blur(14px)`), brand home trigger with `26×26px` `lorekeep-icon.svg` mark, dynamic `/ Section / Document or Game` breadcrumb, recessed `35px` search trigger pill (`Ctrl K`), and bordered Settings button.
- **Floating Dock (`.lk-dock`)**: Centered floating capsule (`bottom: 20px`, `rgba(28, 30, 38, 0.92)`, `blur(18px)`, `--shadow-dock`, `16px` radius) containing five `40px` tabs (`Hub`, `Editor`, `Games`, `Collections`, `Archive`)—with an `18×2.5px` indigo bottom bar on the active tab and a `6px` indigo status dot on `Editor` when a document is open—plus a vertical divider and `+ Write` primary CTA.
- **Command Palette (`.lk-palette`)**: Keyboard-first (`Ctrl + K`) `620px` modal dialog anchored `10vh` from the top (`--bg-surface`, `--border-strong`, `--shadow-dialog`, `14px` radius) performing 100% local instant search across Quick Actions, Documents, Games, Collections, Tags, and Navigation with arrow-key selection and shortcut hints.

### Signature Component: Immersive TipTap Editor & Focus Mode
- **Formatting Ribbon (`.lk-editor-ribbon`)**: Sticky slim bar (`rgba(20, 21, 26, 0.9)`, `blur(12px)`) below the TopBar exposing Undo/Redo, H1–H3, Bold/Italic/Underline/Strike/Code, Bullet/Ordered Lists, Blockquote, Horizontal Rule, silent autosave indicator (`Saved` / `Saving…`, `420ms` debounce), optional tabular word/character count, document actions, and `Focus` (`Alt + F`) toggle.
- **Writing Sheet (`.lk-editor-canvas`)**: Borderless full-canvas writing surface with an unboxed `2.25rem` title input, a quiet single-row inline metadata strip (Game `SelectField`, Collection `SelectField`, `#tag` chips, `+ add tag`), and TipTap `.ProseMirror` rich text (`spellcheck` off by default, `autocorrect="off"`, `autocapitalize="off"`, no character limit, `2px solid var(--accent)` italic blockquotes).
- **Browser Surface Theming**: `:root[data-theme]` sets the active `color-scheme`; the app updates the browser `theme-color`, caret, selection, focus rings, scrollbars, and portaled custom dropdowns to match Slate or Paper. The PWA install splash follows the default Slate palette.

### Named Rules
**The Theme-Aware Browser Surface Rule.** Every browser-controlled surface—document canvas, PWA `theme-color`, text selection, typing caret, focus outline, scrollbars, and select dropdown menus—must match the selected theme so native controls never flash a mismatched palette.

## Do's and Don'ts

### Do:
- **Do** ground new surfaces on the eight-step neutral slate ladder (`--bg-recessed` through `--bg-active`) paired with 1px white-alpha hairline borders (`--border-subtle`, `--border-default`, `--border-strong`).
- **Do** use `--accent-fill` (`#4b5ee8`) with `--accent-ink` (`#ffffff`) for primary CTA buttons and `--accent` (`#5b6ef5`) for focus outlines, active dock bars, checkmarks, and prose blockquotes.
- **Do** preserve `108px` bottom clearance (`--dock-clearance`) on main views and route new sections through the Floating Dock and `Ctrl + K` Command Palette rather than adding a permanent sidebar.
- **Do** use the portaled `SelectField` component (or an equivalent custom dark listbox) instead of native HTML `<select>` elements so dropdown menus match `--bg-elevated` and `--shadow-dialog`.
- **Do** pair `tabular-nums` with JetBrains Mono for shortcut caps and count badges, and use inline two-step confirmation for destructive delete actions instead of disruptive browser `confirm()` dialogs.
- **Do** respect `@media (prefers-reduced-motion: reduce)` by keeping all transitions driven by `--t-fast` (`140ms`), `--t-base` (`210ms`), and `--ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`).

### Don't:
- **Don't** introduce permanent left or right navigation sidebars or multi-pane chrome that competes with the centered `1100px` workspace and Immersive Editor.
- **Don't** add uppercase eyebrow kickers above page or panel headings, or apply `text-transform: uppercase` to buttons, tags, or group labels.
- **Don't** use hard offset shadows, neon indigo outer glows on containers, or bright multi-stop gradients on buttons and chrome (subtle gradients belong solely to 3:4 game cover fallbacks and the Game Detail hero wash).
- **Don't** trigger modal popups, toasts, or forced autocorrect interruptions while the user is actively typing inside the Immersive Editor.
- **Don't** use raw unstyled `<select>` menus or let `theme-color`/`color-scheme` metadata drift from the selected workspace theme.
- **Don't** invent secondary or neon brand accent hues for system chrome; user-picked swatches from `ACCENT_SWATCHES` are strictly for manual game covers and collection identity dots.
