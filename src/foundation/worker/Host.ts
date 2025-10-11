import { ServiceWorkerGlobalScope } from "./api/ServiceWorkerGlobalScope";

const globals = self as any as ServiceWorkerGlobalScope;

export enum HostType {
    LOCAL = 'localhost',
    GITHUB_PAGES = 'github.io'
}

export abstract class Host {
    
    public static getHostType(): HostType {
        if (globals.location.hostname.includes(HostType.GITHUB_PAGES)) {        
            return HostType.GITHUB_PAGES;
        }
        return HostType.LOCAL;
    }
};

