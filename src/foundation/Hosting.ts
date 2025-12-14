function getHostingFromBaseTag(): string | null {
    const baseEl = document.querySelector('base[href]');
    const baseHref = baseEl?.getAttribute('href')?.trim();
    if (!baseHref) return null;

    const absoluteBase = new URL(baseHref, window.location.href);

    if (absoluteBase.origin !== window.location.origin) return null;

    // Normalize pathname: '/example/' -> '/example', '/' -> ''
    const pathname = absoluteBase.pathname.replace(/\/+$/, '');
    return pathname === '/' ? '' : pathname;
}

export const pathSegmentsToKeep : number = window.location.origin.includes(".github.io") ? 1 : 0;

export const HOSTING : string = (() => {
    const fromBase = getHostingFromBaseTag();
    if (fromBase !== null) return fromBase;

    const l = window.location;
    return l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + "";
})();

export const HOSTING_ORIGIN : string = window.location.origin + HOSTING;

console.log("HOSTING:", HOSTING || "/");
console.log("HOSTING ORIGIN:", HOSTING_ORIGIN);
