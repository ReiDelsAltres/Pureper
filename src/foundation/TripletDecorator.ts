import Triplet, { AccessType, TripletBuilder } from "./Triplet.js"
import UniHtml from "./component_api/UniHtml.js"

// Реестр всех триплетов, созданных через декораторы
const tripletRegistry: Array<{ triplet: Triplet<UniHtml>, type: "router" | "markup", name: string }> = [];

export function getRegisteredTriplets(): Array<{ triplet: Triplet<UniHtml>, type: "router" | "markup", name: string }> {
    return tripletRegistry;
}

export async function initializeAllTriplets(): Promise<void> {
    await Promise.all(tripletRegistry.map(entry => entry.triplet.init()));
}

export function ReComponent(html? : string, css?: string, js?: string, access?: AccessType, name?: string) {
    return (ctor: Function) => {
        const triplet = TripletBuilder.create(html, css, js)
        .withUni(ctor as any)
        .withAccess(access ?? AccessType.BOTH)
        .build();

        tripletRegistry.push({ triplet, type: "markup", name: name! });
        triplet.register("markup", name)
    }
}
export function RePage(html? : string, css?: string, js?: string, access?: AccessType, path?: string) {
    return (ctor: Function) => {
        const triplet = TripletBuilder.create(html, css, js)
        .withUni(ctor as any)
        .withAccess(access ?? AccessType.BOTH)
        .build();

        tripletRegistry.push({ triplet, type: "router", name: path! });
        triplet.register("router", path)
    }
}