var _a;
const globals = self;
export var HostType;
(function (HostType) {
    HostType["LOCAL"] = "localhost";
    HostType["GITHUB_PAGES"] = "github.io";
})(HostType || (HostType = {}));
export class Host {
    static getHostType() {
        if (globals.location.hostname.endsWith(HostType.GITHUB_PAGES)) {
            return HostType.GITHUB_PAGES;
        }
        return HostType.LOCAL;
    }
    static getHostPrefix() {
        switch (this.getHostType()) {
            case HostType.GITHUB_PAGES:
                return '/Purper';
            case HostType.LOCAL:
            default:
                return '';
        }
    }
}
_a = Host;
Host.IS_GITHUB_PAGES = _a.getHostType() === HostType.GITHUB_PAGES;
;
//# sourceMappingURL=Host.js.map