const TS_EXTENSION_REGEX = /\.ts$/i;

/**
 * Применяет правило перенаправления:
 *   /something/foo.ts -> /out/something/foo.js
 */
export function rewriteTsToOutJs(url: string): string {
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
export function applyRedirect(url: string): { shouldRedirect: boolean; target: string } {
  const target = rewriteTsToOutJs(url);
  return {
    shouldRedirect: target !== url,
    target,
  };
}

/**
 * Переписывает ссылки в DOM, заменяя пути на out/*.js при необходимости.
 */
export function rewriteDomLinks(root: ParentNode = document): void {
  const candidates: Array<[Element, string]> = [];

  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (href) {
      candidates.push([anchor, 'href']);
    }
  });

  root.querySelectorAll<HTMLScriptElement>('script[src], script[data-src]').forEach((script) => {
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