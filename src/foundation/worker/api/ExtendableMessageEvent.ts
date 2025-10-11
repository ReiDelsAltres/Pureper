import { ExtendableEvent } from './ExtendableEvent';

export interface ExtendableMessageEvent extends ExtendableEvent {
    data: any;
    ports: MessagePort[];
}
