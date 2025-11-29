import Component from "../foundation/component_api/Component.js";
export default class ColorPalettePreview extends Component {
    preLoad(holder) {
        const title = holder.element.getElementsByClassName("title");
        let themeName;
        for (const clas of this.classList) {
            if (!clas.match('.+-theme'))
                continue;
            themeName = clas.replace('-theme', '');
            break;
        }
        title[0].textContent = themeName;
        const colors = holder.element.getElementsByClassName("color");
        for (const colorElement of colors) {
            colorElement.getElementsByClassName("hex")[0].textContent = ""
                + getComputedStyle(document.documentElement)
                    .getPropertyValue(`--color-${colorElement.classList[1]}`).trim().toUpperCase();
        }
        return;
    }
}
//# sourceMappingURL=ColorPalettePreview.html.js.map