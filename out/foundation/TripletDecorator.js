import { AccessType, TripletBuilder } from "./Triplet.js";
export function ReComponent(html, css, js, access, name) {
    return (ctor) => {
        const triplet = TripletBuilder.create(html, css, js)
            .withUni(ctor)
            .withAccess(access ?? AccessType.BOTH)
            .build();
        triplet.register("markup", name);
    };
}
export function RePage(html, css, js, access, path) {
    return (ctor) => {
        const triplet = TripletBuilder.create(html, css, js)
            .withUni(ctor)
            .withAccess(access ?? AccessType.BOTH)
            .build();
        triplet.register("router", path);
    };
}
//# sourceMappingURL=TripletDecorator.js.map