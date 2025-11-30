import { ExtendableEvent } from './ExtendableEvent.js';

export interface ExtendableMessageEvent extends ExtendableEvent {
    data: any;
    ports: MessagePort[];
}
