import { AnyConstructor, UniHtml } from "../index.js";
import Triplet, { RegistryCapture, TripletStruct } from "./Triplet.js"

export function ReComponent(settings: TripletStruct, tag: string) {
    return (ctor: Function) => {
        if (tag == null || tag.length === 0 || !tag.includes("-"))
            throw new Error("Invalid custom element tag name.");

        if (settings.class === null || settings.class === undefined)
            settings.class = ctor as AnyConstructor<UniHtml>;

        const triplet: Triplet = new Triplet(settings);

        triplet.register("markup", tag);

        const paths: string[] = [];
        if (settings.markupURL) paths.push(settings.markupURL);
        if (settings.cssURL) paths.push(settings.cssURL);
        if (settings.ltCssURL) paths.push(settings.ltCssURL);
        if (paths.length > 0) RegistryCapture.capture(ctor, paths);
    }
}
export function RePage(settings: TripletStruct, route: string) {
    return (ctor: Function) => {
        if (route == null || route.length === 0 || !route.startsWith("/"))
            throw new Error("Invalid route path.");

        if (settings.class === null || settings.class === undefined)
            settings.class = ctor as AnyConstructor<UniHtml>;

        const triplet: Triplet = new Triplet(settings);

        triplet.register("router", route);

        const paths: string[] = [];
        if (settings.markupURL) paths.push(settings.markupURL);
        if (settings.cssURL) paths.push(settings.cssURL);
        if (settings.ltCssURL) paths.push(settings.ltCssURL);
        if (paths.length > 0) RegistryCapture.capture(ctor, paths);
    }
}

/**
 * Register an alternative implementation for an existing placeholder.
 *
 * ```ts
 * @ReImplementation({ markupURL: './Fancy.hmle', cssURL: './Fancy.css' }, "re-button")
 * class FancyButton extends Component { ... }
 *
 * // Then switch: Placeholder.switchTo("re-button", "FancyButton");
 * ```
 */
export function ReImplementation(settings: TripletStruct, target: string) {
    return (ctor: Function) => {
        if (target == null || target.length === 0)
            throw new Error("Invalid implementation target.");

        if (settings.class === null || settings.class === undefined)
            settings.class = ctor as AnyConstructor<UniHtml>;

        // Use the class name as the implementation name
        const implName = ctor.name;
        const triplet: Triplet = new Triplet(settings, implName);

        // Register adds the implementation to the existing placeholder (or creates one)
        triplet.register(target.includes("-") ? "markup" : "router", target);

        const paths: string[] = [];
        if (settings.markupURL) paths.push(settings.markupURL);
        if (settings.cssURL) paths.push(settings.cssURL);
        if (settings.ltCssURL) paths.push(settings.ltCssURL);
        if (paths.length > 0) RegistryCapture.capture(ctor, paths);

        console.info(`[ReImplementation:${target}] registered implementation "${implName}"`);
    }
}