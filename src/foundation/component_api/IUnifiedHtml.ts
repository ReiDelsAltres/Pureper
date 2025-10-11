import IElementHolder from "../api/ElementHolder";

export default interface IUnifiedHtml {
    render(holder: IElementHolder, renderTarget: HTMLElement): Promise<void>;
}