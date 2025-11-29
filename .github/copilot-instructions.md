# Pureper Copilot Guide

## Overview
- Pureper is a static SPA served from `index.html`; TypeScript sources compile to ES2020 modules in `out/` via `tsc -p tsconfig.json`.
- Runtime bootstrap lives in `index.html.ts`; after compilation `redirectRules` rewrites `script[data-src]` so the page loads `out/...` assets.
- Components, pages, and router/service-worker utilities sit under `src/`; prebuilt HTML/CSS live alongside in `src/pages` and `src/components`.

## Triplet registration
- Use `TripletBuilder.create(html, css, js)` (see `index.html.ts`) to connect each HTML+CSS+logic triplet; `.register("markup", tag)` defines custom elements, `.register("router", "/path")` exposes SPA routes.
- When adding component logic, export a class extending `Component` or `Page`; pass the compiled `.js` module to `.withUni(...)` so Triplet can instantiate it.
- Light DOM CSS for host pages goes through `.withLightDOMCss()` and is injected into the document head (example: `NavigationDrawer`).
- Triplets call `Fetcher.fetchText` which relies on `Host.getHostPrefix()` for GitHub Pages; keep asset paths relative to repo root.

## Component & page lifecycle
- Base class `UniHtml` (src/foundation/component_api/UniHtml.ts) runs `init → preLoad(holder) → render → postLoad(holder)`; `holder.element` contains a detached DOM tree built from fetched HTML.
- `Component` mixes `HTMLElement` with `UniHtml` (mixin in `component_api/mixin/Proto.ts`); it attaches a shadow root and renders during `connectedCallback`.
- In `preLoad`, prefer DOM queries on `holder.element`; avoid `this.shadowRoot` until `postLoad` (see `components/ReButton.html.ts`).
- `Component.onAttributeChangedCallback` queues handlers for attribute observers; register watchers inside `preLoad`.

## Routing & navigation
- `Router.routeTo()` swaps the page within `<main id="app">`; routes registered through Triplets populate the global `ROUTES`.
- Links with `data-link` leverage the router click handler in `worker/Router.ts` to avoid full reloads; `Host.IS_GITHUB_PAGES` manages `/Pureper` base prefixes.
- Dynamic routes pass the hash string into page constructors (`pages/DynamicPage.html.ts`).

## Service worker & caching
- `src/foundation/worker/ServiceWorker.ts` doubles as worker script and registration helper; keep browser-only APIs gated because the file runs in the SW context.
- Triplets optionally call `ServiceWorker.addToCache` for assets when `.cache()` executes; respect `AccessType` flags to control offline/online availability.
- Update `CACHE_NAME` cautiously; bumping it clears old caches during activation.

## Theming & assets
- Theme CSS sits in `resources/*.theme.css`; `Theme.ts` loads a sheet and adopts it on startup (`init()` in `index.html`).
- `ColorPalettePreview` and similar components read CSS custom properties off `document.documentElement`; maintain `--color-*` variables in theme files.
- Icons use the `SvgIcon` custom element; check `data/componentRegistry.json` for available names and palette metadata.

## Tooling & workflows
- Compile once with `npx tsc -p tsconfig.json`; run `npx tsc -w -p tsconfig.json` for watch mode (matches the default VS Code task).
- Tests are lightweight TypeScript sanity checks in `tests/`; use `npx tsc -p tests/tsconfig.json` to type-check them—no runtime harness is configured.
- Serve locally with any static server from repo root (e.g. `npx http-server .`) so service worker scope and routing behave correctly.

## Common pitfalls
- Always update both the HTML template and the TS logic when introducing new markup fields; Triplet fetches the HTML at runtime, so missing selectors surface as runtime errors.
- Custom elements must be unique; Triplet throws if a tag is already registered.
- When adjusting asset paths, account for GitHub Pages by routing through `Host.getHostPrefix()` or relative URLs resolved by `Fetcher`.
