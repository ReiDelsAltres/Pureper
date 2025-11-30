import { ExtendableEvent } from './ExtendableEvent.js';

export interface FetchEvent extends ExtendableEvent {
    request: Request;
    respondWith(response: Promise<Response> | Response): void;
}
