const globals = self;
export var HostType;
(function (HostType) {
    HostType["LOCAL"] = "localhost";
    HostType["GITHUB_PAGES"] = "github.io";
})(HostType || (HostType = {}));
export class Host {
    static getHostType() {
        if (globals.location.hostname.includes(HostType.GITHUB_PAGES)) {
            return HostType.GITHUB_PAGES;
        }
        return HostType.LOCAL;
    }
}
;
//# sourceMappingURL=Host.js.map