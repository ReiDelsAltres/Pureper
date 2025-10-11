import Page from "./src/foundation/component_api/Page.js";
import { Router } from "./src/foundation/worker/Router.js";

import PalettePage from "./src/pages/PalettePage.html.js"
import MathPage from "./src/pages/MathPage.html.js"
import SubjectsPage from "./src/pages/SubjectsPage.html.js"
import ButtonsPage from "./src/pages/ButtonsPage.html.js"
import DebuggerSubPage from "./src/pages/DebuggerSubPage.html.js"

import Triplet, { TripletBuilder, AccessType } from "./src/foundation/Triplet.js";
import NavigationDrawer from "./src/components/NavigationDrawer.html.js";
import ColorPalettePreview from "./src/components/ColorPalettePreview.html.js";
import SvgIcon from "./src/components/SvgIcon.html.js";
import UniHtml, { UniHtmlComponent } from "./src/foundation/component_api/UniHtml.js";
import ReButton from "./src/components/ReButton.html.js";

TripletBuilder.create(
    "./src/components/NavigationDrawer.html",
    "./src/components/NavigationDrawer.html.css",
    "./src/components/NavigationDrawer.html.ts")
    .withAccess(AccessType.BOTH)
    .withUni(NavigationDrawer)
    .withLightDOMCss("./src/components/NavigationDrawer.html.lt.css")
    .build()
    .register("markup", "navigation-drawer");

TripletBuilder.create(
    "./src/components/PageLayout.html",
    "./src/components/PageLayout.html.css")
    .withAccess(AccessType.BOTH)
    .build()
    .register("markup", "page-layout");

TripletBuilder.create(
    "./src/components/ColorPalettePreview.html",
    "./src/components/ColorPalettePreview.html.css",
    "./src/components/ColorPalettePreview.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(ColorPalettePreview)
    .build()
    .register("markup", "color-palette");

TripletBuilder.create(
    "./src/components/SvgIcon.html",
    "./src/components/SvgIcon.html.css",
    "./src/components/SvgIcon.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(SvgIcon)
    .build()
    .register("markup", "svg-icon");

TripletBuilder.create(
    "./src/components/ReButton.html",
    "./src/components/ReButton.html.css",
    "./src/components/ReButton.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(ReButton)
    .build()
    .register("markup", "re-button");

/*TripletBuilder.create(
    "./pages/DebuggerSubPage.html",
    "./pages/DebuggerSubPage.html.css",
    "./pages/DebuggerSubPage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(DebuggerSubPage)
    .build()
    .register("router", "/debugger-sub");*/

TripletBuilder.create(
    "./pages/MainPage.html"
)
.withAccess(AccessType.BOTH)
.build()
.register("router", "/");

TripletBuilder.create(
    "./pages/PalettePage.html",
    "./pages/PalettePage.html.css",
    "./pages/PalettePage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(PalettePage)
    .build()
    .register("router", "/palettes");

/*Triplet.builder("./pages/ButtonsPage.html",
    "./pages/ButtonsPage.html.css",
    "./pages/ButtonsPage.html.js").defineUni(ButtonsPage);

Router.registerSimpleRoute('pages/MainPage.html', '');
Router.registerSimpleRoute('pages/AboutPage.html', 'about');
Router.registerSimpleRoute('pages/IconsPage.html', 'icons');
let debuggerRoute = Router.registerSimpleRoute('pages/DebuggerPage.html', 'debugger');

Router.registerRoute('pages/PalettePage.html', 'palettes', (path) => new PalettePage(path));
Router.registerRoute('pages/MathPage.html', 'maths', (path) => new MathPage(path));
Router.registerRoute('pages/SubjectsPage.html', 'subjects', (path) => new SubjectsPage(path));
Router.registerRoute('pages/ButtonsPage.html', 'buttons',  (path) => new ButtonsPage(path));
Router.registerRoute('pages/DebuggerSubPage.html', 'tester', (path) => new DebuggerSubPage(path), debuggerRoute);*/