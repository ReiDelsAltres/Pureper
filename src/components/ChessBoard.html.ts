import IElementHolder from "../foundation/api/ElementHolder.js";
import Component from "../foundation/component_api/Component.js";

export default class ChessBoard extends Component {
    static observedAttributes = [];

    protected preLoad(holder: IElementHolder): Promise<void> {
        const board = holder.element;
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const cell = document.createElement("div");
                cell.style.width = "25px";
                cell.style.height = "25px";
                board.appendChild(cell);
            }
        }
        return;    
    }
}