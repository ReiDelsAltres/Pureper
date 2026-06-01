/**
 * Bridges document-level ("global") stylesheets into shadow roots.
 *
 * Shadow DOM is sealed off from `<head>` stylesheets by spec, so global styles
 * (e.g. KaTeX) never reach components rendered inside a shadow root. This bridge
 * mirrors them in with minimal duplication:
 *
 *  - `<link rel="stylesheet">` is referenced by `href` inside each root. The
 *    browser serves the cached resource (no re-download) and, crucially, the
 *    stylesheet's own URL is preserved so relative `url(...)` references (KaTeX
 *    fonts) keep resolving correctly — which inlining the text would break.
 *  - `<style>` blocks are shared through a single constructed `CSSStyleSheet`
 *    instance reused across every root via `adoptedStyleSheets` (zero data
 *    duplication).
 *
 * A single `MutationObserver` on `<head>` forwards later-added global styles
 * (theme switches, lazily-loaded modules) to all live roots.
 */

const MARK = "data-global-style";

const _roots = new Set<WeakRef<ShadowRoot>>();
let _inlineSheet: CSSStyleSheet | null = null;
let _observer: MutationObserver | null = null;

/** Live shadow roots, pruning any that have been garbage-collected. */
function liveRoots(): ShadowRoot[] {
    const live: ShadowRoot[] = [];
    for (const ref of [..._roots]) {
        const root = ref.deref();
        if (root) live.push(root);
        else _roots.delete(ref);
    }
    return live;
}

/** Reference a global `<link>` inside a root (deduped by href). */
function mirrorLink(link: HTMLLinkElement, root: ShadowRoot): void {
    const href = link.href;
    if (!href) return;
    if (root.querySelector(`link[${MARK}][href="${CSS.escape(href)}"]`)) return;
    const clone = document.createElement("link");
    clone.rel = "stylesheet";
    clone.href = href;
    if (link.media) clone.media = link.media;
    clone.setAttribute(MARK, "");
    root.appendChild(clone);
}

/** (Re)build the shared sheet aggregating every global `<style>` block. */
function rebuildInlineSheet(): void {
    const css = [...document.head.querySelectorAll<HTMLStyleElement>("style")]
        .map(s => s.textContent ?? "")
        .join("\n");
    if (!_inlineSheet) _inlineSheet = new CSSStyleSheet();
    _inlineSheet.replaceSync(css);
}

/** Ensure the shared inline sheet is adopted by a root exactly once. */
function adoptInlineSheet(root: ShadowRoot): void {
    if (!_inlineSheet) rebuildInlineSheet();
    if (!root.adoptedStyleSheets.includes(_inlineSheet!)) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, _inlineSheet!];
    }
}

function ensureObserver(): void {
    if (_observer) return;
    _observer = new MutationObserver(mutations => {
        let inlineDirty = false;
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node instanceof HTMLLinkElement && node.rel === "stylesheet") {
                    for (const root of liveRoots()) mirrorLink(node, root);
                } else if (node instanceof HTMLStyleElement) {
                    inlineDirty = true;
                }
            }
            if (m.removedNodes.length && [...m.removedNodes].some(n => n instanceof HTMLStyleElement)) {
                inlineDirty = true;
            }
        }
        if (inlineDirty) {
            rebuildInlineSheet();               // shared instance mutated in place
            for (const root of liveRoots()) adoptInlineSheet(root);
        }
    });
    _observer.observe(document.head, { childList: true });
}

const GlobalStyleBridge = {
    /**
     * Register a shadow root to receive all current and future global styles.
     * Idempotent — safe to call on every (re)load.
     */
    register(root: ShadowRoot): void {
        ensureObserver();
        _roots.add(new WeakRef(root));
        for (const link of document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) {
            mirrorLink(link, root);
        }
        adoptInlineSheet(root);
    }
};

export default GlobalStyleBridge;
