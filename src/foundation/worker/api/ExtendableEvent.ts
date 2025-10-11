export interface ExtendableEvent extends Event {
    waitUntil(promise: Promise<any>): void;
}
