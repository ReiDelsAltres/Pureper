import { AccessType, TripletBuilder } from "./Triplet.js"

export function ReComponent(html? : string, css?: string, js?: string, access?: AccessType, name?: string, 
    additionalCss?: string) {
    return (ctor: Function) => {
        const builder = TripletBuilder.create(html, css, js)
        .withUni(ctor as any)
        .withAccess(access ?? AccessType.BOTH);

        if (additionalCss)
            builder.withLightDOMCss(additionalCss);

        const triplet = builder.build();

        triplet.register("markup", name)
    }
}
export function RePage(html? : string, css?: string, js?: string, access?: AccessType, path?: string,
    additionalCss?: string
) {
    return (ctor: Function) => {
        const builder = TripletBuilder.create(html, css, js)
        .withUni(ctor as any)
        .withAccess(access ?? AccessType.BOTH);

        if (additionalCss)
            builder.withLightDOMCss(additionalCss)

        const triplet = builder.build();

        triplet.register("router", path)
    }
}