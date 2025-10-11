import { ExtendableEvent } from './ExtendableEvent';

export interface FetchEvent extends ExtendableEvent {
    request: Request;
    respondWith(response: Promise<Response> | Response): void;
}
