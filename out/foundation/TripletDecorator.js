import Triplet from "./Triplet.js";
export function ReComponent(settings, tag) {
    return (ctor) => {
        if (tag == null || tag.length === 0 || !tag.includes("-"))
            throw new Error("Invalid custom element tag name.");
        if (settings.class === null || settings.class === undefined)
            settings.class = ctor;
        const triplet = new Triplet(settings);
        triplet.register("markup", tag)
            .then(ok => {
            if (!ok)
                console.error(`[ReComponent:${tag}] registration returned false`);
        })
            .catch(err => console.error(`[ReComponent:${tag}] register failed`, err));
    };
}
export function RePage(settings, route) {
    return (ctor) => {
        if (route == null || route.length === 0 || !route.startsWith("/"))
            throw new Error("Invalid route path.");
        if (settings.class === null || settings.class === undefined)
            settings.class = ctor;
        const triplet = new Triplet(settings);
        triplet.register("router", route)
            .then(ok => {
            if (!ok)
                console.error(`[RePage:${route}] registration returned false`);
        })
            .catch(err => console.error(`[RePage:${route}] register failed`, err));
    };
}
//# sourceMappingURL=TripletDecorator.js.map