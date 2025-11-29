URL.prototype.isAbsolute = function () {
    return /^(?:[a-z]+:)?\/\//i.test(this.href);
};
URL.prototype.isRelative = function () {
    return !this.isAbsolute();
};
URL.prototype.tryToMakeAbsolute = function () {
    // already absolute? nothing to do
    if (this.isAbsolute())
        return this;
    const href = String(this.href).trim();
    // protocol-relative: //example.com -> keep current protocol
    if (/^\/\/.+/i.test(href)) {
        return new URL(window.location.protocol + href);
    }
    // absolute path on current origin: /path/to/res
    if (/^\//.test(href)) {
        return new URL(href, window.location.origin);
    }
    // relative path (./, ../ or bare path) -> resolve against current document URL
    if (/^(\.\/|\.\.\/|[^/]).*/.test(href)) {
        return new URL(href, window.location.href);
    }
    // fallback: try resolving against origin
    try {
        return new URL(href, window.location.origin);
    }
    catch {
        return this;
    }
};
URL.prototype.tryToMakeRelative = function () {
    // already looks relative? nothing to do
    if (this.isRelative())
        return this;
    try {
        const target = new URL(String(this.href));
        const origin = window.location.origin;
        // can't make relative across origins -> keep as-is
        if (target.origin !== origin)
            return this;
        // current document path (directory)
        const basePath = window.location.pathname;
        const baseDir = basePath.endsWith('/') ? basePath : basePath.replace(/\/[^\/]*$/, '/');
        // split into path segments (drop leading/trailing slashes)
        const baseParts = baseDir.replace(/(^\/|\/$)/g, '').split('/').filter(Boolean);
        const targetParts = target.pathname.replace(/(^\/|\/$)/g, '').split('/').filter(Boolean);
        // find common prefix
        let i = 0;
        while (i < baseParts.length && i < targetParts.length && baseParts[i] === targetParts[i])
            i++;
        // up for each remaining segment in baseParts
        const up = baseParts.length - i;
        const relParts = [];
        for (let j = 0; j < up; j++)
            relParts.push('..');
        relParts.push(...targetParts.slice(i));
        // build relative string
        let rel = relParts.join('/');
        if (!rel) {
            rel = './';
        }
        else if (!/^(\.\/|\.\.\/)/.test(rel)) {
            rel = './' + rel;
        }
        // preserve search & hash
        if (target.search)
            rel += target.search;
        if (target.hash)
            rel += target.hash;
        return new URL(rel, window.location.href);
    }
    catch {
        return this;
    }
};
export {};
//# sourceMappingURL=UrlExtensions.js.map