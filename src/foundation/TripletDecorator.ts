import { AccessType, TripletBuilder } from "./Triplet.js"

export function Component(html? : string, css?: string, js?: string, access?: AccessType, name?: string) {
    return (ctor: Function) => {
        const triplet = TripletBuilder.create(html, css, js)
        .withUni(ctor as any)
        .withAccess(access ?? AccessType.BOTH)
        .build();

        triplet.register("markup", name)
    }
}
export function Page(html? : string, css?: string, js?: string, access?: AccessType, path?: string) {
    return (ctor: Function) => {
        const triplet = TripletBuilder.create(html, css, js)
        .withUni(ctor as any)
        .withAccess(access ?? AccessType.BOTH)
        .build();

        triplet.register("router", path)
    }
}


@Page()
class myFirstPlugin {}