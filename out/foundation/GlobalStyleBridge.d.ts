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
declare const GlobalStyleBridge: {
    /**
     * Register a shadow root to receive all current and future global styles.
     * Idempotent — safe to call on every (re)load.
     */
    register(root: ShadowRoot): void;
};
export default GlobalStyleBridge;
//# sourceMappingURL=GlobalStyleBridge.d.ts.map