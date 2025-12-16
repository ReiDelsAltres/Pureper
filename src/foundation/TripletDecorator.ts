import { AnyConstructor, UniHtml } from "../index.js";
import Triplet, { AccessType, TripletStruct } from "./Triplet.js"

export function ReComponent(settings: TripletStruct, tag: string) {
    return (ctor: Function) => {
        if (tag == null || tag.length === 0 || !tag.includes("-"))
            throw new Error("Invalid custom element tag name.");

        if (settings.class === null || settings.class === undefined)
            settings.class = ctor as AnyConstructor<UniHtml>;

        const triplet: Triplet = new Triplet(settings);

        triplet.register("markup", tag)
            .then(ok => {
                if (!ok) console.error(`[ReComponent:${tag}] registration returned false`);
            })
            .catch(err => console.error(`[ReComponent:${tag}] register failed`, err));
    }
}
export function RePage(settings: TripletStruct, route: string) {
    return (ctor: Function) => {
        if (route == null || route.length === 0 || !route.startsWith("/"))
            throw new Error("Invalid route path.");

        if (settings.class === null || settings.class === undefined)
            settings.class = ctor as AnyConstructor<UniHtml>;
        
        const triplet: Triplet = new Triplet(settings);

        triplet.register("router", route)
            .then(ok => {
                if (!ok) console.error(`[RePage:${route}] registration returned false`);
            })
            .catch(err => console.error(`[RePage:${route}] register failed`, err));
    }
}