import Triplet, { AccessType, TripletStruct } from "./Triplet.js"
export function ReComponent(settings: TripletStruct, tag: string) {
    return async (ctor: Function) => {
        if (tag == null || tag.length === 0 || !tag.includes("-"))
            throw new Error("Invalid custom element tag name.");

        const triplet: Triplet = new Triplet(settings);

        await triplet.register("markup", tag)
        return ctor;
    }
}
export function RePage(settings: TripletStruct, route: string) {
    return async (ctor: Function) => {
        if (route == null || route.length === 0 || !route.startsWith("/"))
            throw new Error("Invalid route path.");
        
        const triplet: Triplet = new Triplet(settings);

        await triplet.register("router", route)
        return ctor;
    }
}