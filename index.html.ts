import { AnyConstructor } from "./src/foundation/component_api/mixin/Proto.js"
import { TripletBuilder, AccessType } from "./src/foundation/Triplet.js";
import { Router } from "./src/foundation/worker/Router.js";

import PalettePage from "./src/pages/PalettePage.html.js"
import MathPage from "./src/pages/MathPage.html.js"
import SubjectsPage from "./src/pages/SubjectsPage.html.js"
import ButtonsPage from "./src/pages/ButtonsPage.html.js"
import DebuggerSubPage from "./src/pages/DebuggerSubPage.html.js"

import NavigationDrawer from "./src/components/NavigationDrawer.html.js";
import ColorPalettePreview from "./src/components/ColorPalettePreview.html.js";
import SvgIcon from "./src/components/SvgIcon.html.js";
import ReButton from "./src/components/ReButton.html.js";

export default class Index {
    public static async initialize() : Promise<void> {
        await Promise.all([
            NAVIGATION_DRAWER,
            PAGE_LAYOUT,
            COLOR_PALETTE_PREVIEW,
            SVG_ICON,
            RE_BUTTON,
            MAIN_PAGE,
            PALETTE_PAGE,
            BUTTONS_PAGE
        ]);
    }
}

const NAVIGATION_DRAWER: Promise<boolean> = TripletBuilder.create(
    "./src/components/NavigationDrawer.html",
    "./src/components/NavigationDrawer.html.css",
    "./src/components/NavigationDrawer.html.ts")
    .withAccess(AccessType.BOTH)
    .withUni(NavigationDrawer)
    .withLightDOMCss("./src/components/NavigationDrawer.html.lt.css")
    .build()
    .register("markup", "navigation-drawer");

const PAGE_LAYOUT: Promise<boolean> = TripletBuilder.create(
    "./src/components/PageLayout.html",
    "./src/components/PageLayout.html.css")
    .withAccess(AccessType.BOTH)
    .build()
    .register("markup", "page-layout");

const COLOR_PALETTE_PREVIEW: Promise<boolean> = TripletBuilder.create(
    "./src/components/ColorPalettePreview.html",
    "./src/components/ColorPalettePreview.html.css",
    "./src/components/ColorPalettePreview.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(ColorPalettePreview)
    .build()
    .register("markup", "color-palette");

const SVG_ICON: Promise<boolean> = TripletBuilder.create(
    "./src/components/SvgIcon.html",
    "./src/components/SvgIcon.html.css",
    "./src/components/SvgIcon.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(SvgIcon)
    .build()
    .register("markup", "svg-icon");

const RE_BUTTON: Promise<boolean> = TripletBuilder.create(
    "./src/components/ReButton.html",
    "./src/components/ReButton.html.css",
    "./src/components/ReButton.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(ReButton)
    .build()
    .register("markup", "re-button");

const MAIN_PAGE: Promise<boolean> = TripletBuilder.create(
    "./src/pages/MainPage.html")
    .withAccess(AccessType.BOTH)
    .build()
    .register("router", "/");

const PALETTE_PAGE: Promise<boolean> = TripletBuilder.create(
    "./src/pages/PalettePage.html",
    "./src/pages/PalettePage.html.css",
    "./src/pages/PalettePage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(PalettePage)
    .build()
    .register("router", "/palettes");

const BUTTONS_PAGE: Promise<boolean> = TripletBuilder.create(
    "./src/pages/ButtonsPage.html",
    "./src/pages/ButtonsPage.html.css",
    "./src/pages/ButtonsPage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(ButtonsPage)
    .build()
    .register("router", "/buttons");

Index.initialize().then(() => {
    let persistedRoute: string | null = Router.getPersistedRoute();

    if (persistedRoute) {
        Router.clearPersistedRoute();
        Router.tryRouteTo(persistedRoute);
    }

    else {
        Router.tryRouteTo("/");
    }
}).catch(error => {
    console.error("Error during initialization:", error);
});