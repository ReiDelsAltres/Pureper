import { AccessType, TripletBuilder } from "./Triplet.js"

export function ReComponent(html? : string, css?: string, js?: string, access?: AccessType, name?: string) {
    return (ctor: Function) => {
        const triplet = TripletBuilder.create(html, css, js)
        .withUni(ctor as any)
        .withAccess(access ?? AccessType.BOTH)
        .build();

        triplet.register("markup", name)
    }
}
export function RePage(html? : string, css?: string, js?: string, access?: AccessType, path?: string) {
    return (ctor: Function) => {
        const triplet = TripletBuilder.create(html, css, js)
        .withUni(ctor as any)
        .withAccess(access ?? AccessType.BOTH)
        .build();

        triplet.register("router", path)
    }
}