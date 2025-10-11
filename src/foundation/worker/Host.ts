import { ServiceWorkerGlobalScope } from "./api/ServiceWorkerGlobalScope.js";

const globals = self as any as ServiceWorkerGlobalScope;

export enum HostType {
    LOCAL = 'localhost',
    GITHUB_PAGES = 'github.io'
}

export abstract class Host {
    public static readonly IS_GITHUB_PAGES: boolean = this.getHostType() === HostType.GITHUB_PAGES;  
    public static getHostType(): HostType {
        if (globals.location.hostname.endsWith(HostType.GITHUB_PAGES)) {        
            return HostType.GITHUB_PAGES;
        }
        return HostType.LOCAL;
    }
    public static getHostPrefix(): string {
        switch (this.getHostType()) {
            case HostType.GITHUB_PAGES:
                return '/Purper';
            case HostType.LOCAL:
            default:
                return '';
        }
    }
};

