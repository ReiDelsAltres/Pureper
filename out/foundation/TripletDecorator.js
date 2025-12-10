import { AccessType, TripletBuilder } from "./Triplet.js";
export function ReComponent(html, css, js, access, name, additionalCss) {
    return (ctor) => {
        const builder = TripletBuilder.create(html, css, js)
            .withUni(ctor)
            .withAccess(access ?? AccessType.BOTH);
        if (additionalCss)
            builder.withLightDOMCss(additionalCss);
        const triplet = builder.build();
        triplet.register("markup", name);
    };
}
export function RePage(html, css, js, access, path, additionalCss) {
    return (ctor) => {
        const builder = TripletBuilder.create(html, css, js)
            .withUni(ctor)
            .withAccess(access ?? AccessType.BOTH);
        if (additionalCss)
            builder.withLightDOMCss(additionalCss);
        const triplet = builder.build();
        triplet.register("router", path);
    };
}
//# sourceMappingURL=TripletDecorator.js.map