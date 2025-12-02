import { AccessType, TripletBuilder } from "./Triplet.js";
// Реестр всех триплетов, созданных через декораторы
const tripletRegistry = [];
export function getRegisteredTriplets() {
    return tripletRegistry;
}
export async function initializeAllTriplets() {
    await Promise.all(tripletRegistry.map(entry => entry.triplet.init()));
}
export function ReComponent(html, css, js, access, name) {
    return (ctor) => {
        const triplet = TripletBuilder.create(html, css, js)
            .withUni(ctor)
            .withAccess(access ?? AccessType.BOTH)
            .build();
        tripletRegistry.push({ triplet, type: "markup", name: name });
        triplet.register("markup", name);
    };
}
export function RePage(html, css, js, access, path) {
    return (ctor) => {
        const triplet = TripletBuilder.create(html, css, js)
            .withUni(ctor)
            .withAccess(access ?? AccessType.BOTH)
            .build();
        tripletRegistry.push({ triplet, type: "router", name: path });
        triplet.register("router", path);
    };
}
//# sourceMappingURL=TripletDecorator.js.map