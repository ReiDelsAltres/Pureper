import Triplet from "./Triplet.js";
export function ReComponent(settings, tag) {
    return async (ctor) => {
        if (tag == null || tag.length === 0 || !tag.includes("-"))
            throw new Error("Invalid custom element tag name.");
        const triplet = new Triplet(settings);
        await triplet.register("markup", tag);
        return ctor;
    };
}
export function RePage(settings, route) {
    return async (ctor) => {
        if (route == null || route.length === 0 || !route.startsWith("/"))
            throw new Error("Invalid route path.");
        const triplet = new Triplet(settings);
        await triplet.register("router", route);
        return ctor;
    };
}
//# sourceMappingURL=TripletDecorator.js.map