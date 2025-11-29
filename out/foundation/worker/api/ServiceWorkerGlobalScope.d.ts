import { Clients } from './Clients';
import { ExtendableEvent } from './ExtendableEvent';
import { FetchEvent } from './FetchEvent';
import { ExtendableMessageEvent } from './ExtendableMessageEvent';
export interface ServiceWorkerGlobalScope {
    skipWaiting(): Promise<void>;
    clients: Clients;
    location: Location;
    addEventListener(type: 'install', listener: (event: ExtendableEvent) => void): void;
    addEventListener(type: 'activate', listener: (event: ExtendableEvent) => void): void;
    addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
    addEventListener(type: 'message', listener: (event: ExtendableMessageEvent) => void): void;
}
//# sourceMappingURL=ServiceWorkerGlobalScope.d.ts.map