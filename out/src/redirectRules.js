const TS_EXTENSION_REGEX = /\.ts$/i;
let envValues = null;
let envLoadPromise = null;
export async function loadEnvModule() {
    if (envLoadPromise) {
        return envLoadPromise;
    }
    envLoadPromise = (async () => {
        try {
            const response = await fetch('/env.js', { method: 'HEAD' });
            if (!response.ok) {
                console.info('[RedirectRule] env.js not found (HTTP', response.status, ').');
                return null;
            }
            // @ts-ignore Dynamic runtime import; env.js is generated during deploy.
            const module = (await import(/* @vite-ignore */ '/env.js'));
            envValues = module;
            console.info('[RedirectRule] env.js loaded:', Object.keys(module));
            return module;
        }
        catch (error) {
            console.warn('[RedirectRule] Failed to load env.js:', error);
            return null;
        }
    })();
    return envLoadPromise;
}
loadEnvModule().catch((err) => {
    console.warn('Env not available', err);
});
export async function getEnvValue(key) {
    const module = envValues ?? (await loadEnvModule());
    if (!module) {
        return null;
    }
    return module[key] ?? null;
}
/**
 * Применяет правило перенаправления:
 *   /something/foo.ts -> /out/something/foo.js
 */
export function rewriteTsToOutJs(url) {
    if (!TS_EXTENSION_REGEX.test(url)) {
        return url;
    }
    let normalized = url;
    if (!normalized.startsWith("/")) {
        normalized = `/${normalized}`;
    }
    const withoutLeadingSlash = normalized.slice(1);
    const transformed = withoutLeadingSlash.replace(TS_EXTENSION_REGEX, ".js");
    return `out/${transformed}`;
}
/**
 * Пример использования правила.
 */
export function applyRedirect(url) {
    const target = rewriteTsToOutJs(url);
    return {
        shouldRedirect: target !== url,
        target,
    };
}
/**
 * Переписывает ссылки в DOM, заменяя пути на out/*.js при необходимости.
 */
export function rewriteDomLinks(root = document) {
    const candidates = [];
    root.querySelectorAll('a[href]').forEach((anchor) => {
        const href = anchor.getAttribute('href');
        if (href) {
            candidates.push([anchor, 'href']);
        }
    });
    root.querySelectorAll('script[src], script[data-src]').forEach((script) => {
        const key = script.hasAttribute('src') ? 'src' : 'data-src';
        const value = script.getAttribute(key);
        if (value) {
            candidates.push([script, key]);
        }
    });
    candidates.forEach(([element, attr]) => {
        const value = element.getAttribute(attr);
        if (!value) {
            return;
        }
        const { shouldRedirect, target } = applyRedirect(value);
        if (attr === 'data-src') {
            const resolved = shouldRedirect ? target : value;
            element.setAttribute('src', resolved);
            element.removeAttribute('data-src');
            if (shouldRedirect) {
                console.info(`[RedirectRule]: ${value} -> ${resolved}`);
            }
            return;
        }
        if (shouldRedirect) {
            element.setAttribute(attr, target);
            console.info(`[RedirectRule]: ${value} -> ${target}`);
        }
    });
}
//# sourceMappingURL=redirectRules.js.map