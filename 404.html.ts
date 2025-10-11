import { Router } from "./out/src/foundation/worker/Router.js";

Router.savePersistedRoute(window.location.pathname);
Router.legacyRouteTo("index.html");