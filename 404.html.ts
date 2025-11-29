import { Router } from "./src/foundation/worker/Router.js";

let fff = window.location;

Router.savePersistedRoute(new URL(window.location.href));
Router.legacyRouteTo("index.html");