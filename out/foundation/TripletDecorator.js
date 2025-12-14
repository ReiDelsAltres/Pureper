import Triplet from "./Triplet.js";
export function ReComponent(settings, tag) {
    return (ctor) => {
        if (tag == null || tag.length === 0 || !tag.includes("-"))
            throw new Error("Invalid custom element tag name.");
        const triplet = new Triplet(settings);
        triplet.register("markup", tag);
    };
}
export function RePage(settings, route) {
    return (ctor) => {
        if (route == null || route.length === 0 || !route.startsWith("/"))
            throw new Error("Invalid route path.");
        const triplet = new Triplet(settings);
        triplet.register("router", route);
    };
}
//# sourceMappingURL=TripletDecorator.js.map