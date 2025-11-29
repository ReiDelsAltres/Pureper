import { TripletBuilder, AccessType } from "./src/foundation/Triplet.js";
import { Router } from "./src/foundation/worker/Router.js";
import PalettePage from "./src/pages/PalettePage.html.js";
import MathPage from "./src/pages/MathPage.html.js";
import ButtonsPage from "./src/pages/ButtonsPage.html.js";
import ChessHomePage from "./src/pages/ChessHomePage.html.js";
import ChessHistoryPage from "./src/pages/ChessHistoryPage.html.js";
import TestingPage from "./src/pages/TestingPage.html.js";
import TestingSubPage from "./src/pages/TestingSubPage.html.js";
import NavigationDrawer from "./src/components/NavigationDrawer.html.js";
import ColorPalettePreview from "./src/components/ColorPalettePreview.html.js";
import SvgIcon from "./src/components/SvgIcon.html.js";
import ReButton from "./src/components/ReButton.html.js";
import DebuggerPage from "./src/pages/DebuggerPage.html.js";
import SubjectPage from "./src/pages/SubjectsPage.html.js";
import DynamicPage from "./src/pages/DynamicPage.html.js";
import AppGrail from "./src/components/AppGrail.html.js";
import Paper from "./src/components/PaperComponent.html.js";
import ChessBoard from "./src/components/ChessBoard.html.js";
export default class Index {
    static async initialize() {
        await Promise.all([
            APP_GRAIL.register("markup", "app-grail"),
            CHESS_BOARD.register("markup", "chess-board"),
            PAPER.register("markup", "paper-component"),
            NAVIGATION_DRAWER.register("markup", "navigation-drawer"),
            COLOR_PALETTE_PREVIEW.register("markup", "color-palette"),
            SVG_ICON.register("markup", "svg-icon"),
            RE_BUTTON.register("markup", "re-button"),
            MAIN_PAGE.register("router", "/"),
            PALETTE_PAGE.register("router", "/palettes"),
            BUTTONS_PAGE.register("router", "/buttons"),
            ABOUT_PAGE.register("router", "/about"),
            DEBUGGER_PAGE.register("router", "/debugger"),
            ICONS_PAGE.register("router", "/icons"),
            MATH_PAGE.register("router", "/math"),
            SUBJECT_PAGE.register("router", "/subjects"),
            DYNAMIC_PAGE.register("router", "/dynamic"),
            TESTING_PAGE.register("router", "/testing"),
            TESTING_SUBPAGE.register("router", "/testing/sub"),
            CHESS_HOME_PAGE.register("router", "/chess"),
            CHESS_HISTORY_PAGE.register("router", "/chess/history"),
            APP_GRAIL.init(),
            CHESS_BOARD.init(),
            PAPER.init(),
            NAVIGATION_DRAWER.init(),
            COLOR_PALETTE_PREVIEW.init(),
            SVG_ICON.init(),
            RE_BUTTON.init(),
            MAIN_PAGE.init(),
            PALETTE_PAGE.init(),
            BUTTONS_PAGE.init(),
            ABOUT_PAGE.init(),
            DEBUGGER_PAGE.init(),
            ICONS_PAGE.init(),
            MATH_PAGE.init(),
            SUBJECT_PAGE.init(),
            DYNAMIC_PAGE.init(),
            TESTING_PAGE.init(),
            TESTING_SUBPAGE.init(),
            CHESS_HOME_PAGE.init(),
            CHESS_HISTORY_PAGE.init()
        ]);
    }
}
const APP_GRAIL = TripletBuilder.create("./src/components/AppGrail.html", "./src/components/AppGrail.html.css", "./src/components/AppGrail.html.ts")
    .withAccess(AccessType.BOTH)
    .withUni(AppGrail)
    .build();
const PAPER = TripletBuilder.create("./src/components/PaperComponent.html", "./src/components/PaperComponent.html.css", "./src/components/PaperComponent.html.ts")
    .withAccess(AccessType.BOTH)
    .withUni(Paper)
    .withLightDOMCss("./src/components/PaperComponent.html.lt.css")
    .build();
const CHESS_BOARD = TripletBuilder.create("./src/components/ChessBoard.html", "./src/components/ChessBoard.html.css", "./src/components/ChessBoard.html.ts")
    .withAccess(AccessType.BOTH)
    .withUni(ChessBoard)
    .build();
const NAVIGATION_DRAWER = TripletBuilder.create("./src/components/NavigationDrawer.html", "./src/components/NavigationDrawer.html.css", "./src/components/NavigationDrawer.html.ts")
    .withAccess(AccessType.BOTH)
    .withUni(NavigationDrawer)
    .withLightDOMCss("./src/components/NavigationDrawer.html.lt.css")
    .build();
const COLOR_PALETTE_PREVIEW = TripletBuilder.create("./src/components/ColorPalettePreview.html", "./src/components/ColorPalettePreview.html.css", "./src/components/ColorPalettePreview.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(ColorPalettePreview)
    .build();
const SVG_ICON = TripletBuilder.create("./src/components/SvgIcon.html", "./src/components/SvgIcon.html.css", "./src/components/SvgIcon.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(SvgIcon)
    .build();
const RE_BUTTON = TripletBuilder.create("./src/components/ReButton.html", "./src/components/ReButton.html.css", "./src/components/ReButton.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(ReButton)
    .build();
const MAIN_PAGE = TripletBuilder.create("./src/pages/MainPage.html", "./src/pages/MainPage.html.css")
    .withAccess(AccessType.BOTH)
    .build();
const PALETTE_PAGE = TripletBuilder.create("./src/pages/PalettePage.html", "./src/pages/PalettePage.html.css", "./src/pages/PalettePage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(PalettePage)
    .build();
const BUTTONS_PAGE = TripletBuilder.create("./src/pages/ButtonsPage.html", "./src/pages/ButtonsPage.html.css", "./src/pages/ButtonsPage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(ButtonsPage)
    .build();
const ABOUT_PAGE = TripletBuilder.create("./src/pages/AboutPage.html")
    .withAccess(AccessType.BOTH)
    .build();
const DEBUGGER_PAGE = TripletBuilder.create("./src/pages/DebuggerPage.html", "./src/pages/DebuggerPage.html.css", "./src/pages/DebuggerPage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(DebuggerPage)
    .build();
const ICONS_PAGE = TripletBuilder.create("./src/pages/IconsPage.html", "./src/pages/IconsPage.html.css", "./src/pages/IconsPage.html.js")
    .withAccess(AccessType.BOTH)
    .build();
const MATH_PAGE = TripletBuilder.create("./src/pages/MathPage.html", "./src/pages/MathPage.html.css", "./src/pages/MathPage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(MathPage)
    .build();
const SUBJECT_PAGE = TripletBuilder.create("./src/pages/SubjectPage.html", "./src/pages/SubjectPage.html.css", "./src/pages/SubjectPage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(SubjectPage)
    .build();
const DYNAMIC_PAGE = TripletBuilder.create("./src/pages/DynamicPage.html", "./src/pages/DynamicPage.html.css", "./src/pages/DynamicPage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(DynamicPage)
    .build();
const TESTING_PAGE = TripletBuilder.create("./src/pages/TestingPage.html", "./src/pages/TestingPage.html.css", "./src/pages/TestingPage.html.ts")
    .withAccess(AccessType.BOTH)
    .withUni(TestingPage)
    .build();
const TESTING_SUBPAGE = TripletBuilder.create("./src/pages/TestingSubPage.html", "./src/pages/TestingSubPage.html.css", "./src/pages/TestingSubPage.html.ts")
    .withAccess(AccessType.BOTH)
    .withUni(TestingSubPage)
    .build();
const CHESS_HOME_PAGE = TripletBuilder.create("./src/pages/ChessHomePage.html", "./src/pages/ChessHomePage.html.css", "./src/pages/ChessHomePage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(ChessHomePage)
    .build();
const CHESS_HISTORY_PAGE = TripletBuilder.create("./src/pages/ChessHistoryPage.html", "./src/pages/ChessHistoryPage.html.css", "./src/pages/ChessHistoryPage.html.js")
    .withAccess(AccessType.BOTH)
    .withUni(ChessHistoryPage)
    .build();
Index.initialize().then(() => {
    let persistedRoute = Router.getPersistedRoute();
    if (persistedRoute) {
        Router.clearPersistedRoute();
        Router.tryRouteTo(persistedRoute);
    }
    else {
        Router.tryRouteTo(new URL("/", window.location.origin));
    }
}).catch(error => {
    console.error("Error during initialization:", error);
});
//# sourceMappingURL=index.html.js.map