
# Copilot Instructions for Pureper Project

## Project Overview
This is a static web application using custom elements (Web Components) for UI composition. The architecture is modular, with each UI component defined by a trio of files: HTML template, CSS, and a JS class extending a base `Component` class. The project does not use a build system or framework; all logic is in vanilla JS/HTML/CSS.


## Key Architectural Patterns
- **Component System:**
	- All interactive UI elements extend `Component` (`src/foundation/component/Component.js`), which loads HTML templates and styles into a shadow DOM.
	- Instead of using `connectedCallback`, put initialization logic in the `init()` method (called automatically after template is loaded).
	- **Instead of using `attributeChangedCallback`, use the `onAttributeChanged` method provided by the base `Component` class to react to attribute changes.**
	- Example: `NavigationDrawer.html.js` loads `NavigationDrawer.html` and its CSS, and is registered as `<navigation-drawer>`.
- **Shadow DOM & Slots:**
	- Components use shadow DOM for encapsulation. Slots are used for content injection (see `PageLayout.html`, `NavigationDrawer.html`).
- **Attribute/Property Sync:**
	- Components observe attributes (e.g., `open` on `NavigationDrawer`) and update internal state and classes accordingly. Use `onAttributeChanged` for attribute observation.
- **Color Palette System:**
	- Color palettes are defined in `src/foundation/theme/ColorPalettes.js` using the `IColorPalette` interface and `SimpleColorPalette` implementation.

## Developer Workflows
- **Running the App:**
	- Open `index.html` in a browser. No build or server is required.
- **Adding Components:**
	- Create a `.html` (template), `.html.css` (styles), and `.html.js` (logic) file in `components/`.
	- Extend `Component` and register with `customElements.define`.
	- Reference the template and CSS in the JS constructor.
- **Styling:**
	- Use component-specific CSS files. Shared styles (e.g., color palette) are in `src/foundation/theme/ColorPalette.css`.
- **State/Events:**
	- Use attributes and custom events for cross-component communication. See how `PageLayout` listens for `open` changes on `NavigationDrawer`.

## Project Conventions
- **File Naming:**
	- Component files: `ComponentName.html`, `ComponentName.html.css`, `ComponentName.html.js`.
	- Foundation code: `src/foundation/` (core logic, interfaces, themes).
- **No Frameworks:**
	- No React/Vue/Angular. All code is ES6+ vanilla JS.
- **No Build Step:**
	- All files are loaded directly by the browser. Avoid features requiring transpilation.

## Key Files/Directories
- `components/` — All UI components (HTML, CSS, JS per component)
- `src/foundation/component/Component.js` — Base class for all components
- `src/foundation/theme/` — Color palette logic and shared styles
- `index.html` — App entry point

## Examples
- To add a new color palette, implement `IColorPalette` and register it in `ColorPalettes.js`.
- To create a new UI element, follow the pattern in `NavigationDrawer.html.js` and related files.

## Limitations
- No automated tests or build scripts are present.
- No package manager or external dependencies.

---
Checklist below is for project setup tracking only:
- [x] Verify that the copilot-instructions.md file in the .github directory is created.
- [x] Scaffold the Project
- [x] Ensure Documentation is Complete
