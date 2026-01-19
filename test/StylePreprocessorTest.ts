import { JSDOM } from 'jsdom';
import Scope from '../src/foundation/engine/Scope.js';
import StylePreprocessor from './../src/foundation/engine/StylePreprocessor.js';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
const { document } = dom.window;
(global as any).document = document;
(global as any).Element = dom.window.Element;
(global as any).DocumentFragment = dom.window.DocumentFragment;

(global as any).NodeFilter = dom.window.NodeFilter;
(global as any).Node = dom.window.Node;
(global as any).CSSStyleSheet = dom.window.CSSStyleSheet;

const template = `
@for variant in variants {
    @if variant.signature=="outlined" {
        :host([variant="outlined"]) {
            --chip-bg-color: transparent;
            --chip-border: 1px solid var(--chip-text-color);
        }
    }
    @if variant.signature=="text" {
        :host([variant="text"]) {
            --chip-bg-color: transparent;
            --chip-border: none;
        }
    }
    @if variant.signature=="filled" {

        :host(:not([variant])),
        :host([variant="filled"]) {
            --chip-border: none;
        }
        @continue;
    }
    @for color in colors {
        :host([variant="@variant.signature"][color="@color.signature"]) {
            @if variant.signature=="outlined" {
                --chip-text-color: @color.main;
            }

            @if variant.signature=="text" {
                --chip-text-color: @color.main;
                --chip-hover-bg-color: @color.hover;
            }
        }
    }
}
@for color in colors {
}`;


const scope = Scope.from({});
scope.set('colors', [
    { signature: 'primary', main: 'var(--color-primary)', contrast: 'var(--color-primary-contrast)', hover: 'var(--color-primary-hover)' },
    { signature: 'secondary', main: 'var(--color-secondary)', contrast: 'var(--color-secondary-contrast)', hover: 'var(--color-secondary-hover)' },
    { signature: 'tertiary', main: 'var(--color-tertiary)', contrast: 'var(--color-tertiary-contrast)', hover: 'var(--color-tertiary-hover)' },
    { signature: 'additional', main: 'var(--color-additional)', contrast: 'var(--color-additional-contrast)', hover: 'var(--color-additional-hover)' },
    { signature: 'success', main: 'var(--color-success)', contrast: 'var(--color-success-contrast)', hover: 'var(--color-success-hover)' },
    { signature: 'warning', main: 'var(--color-warning)', contrast: 'var(--color-warning-contrast)', hover: 'var(--color-warning-hover)' },
    { signature: 'error', main: 'var(--color-error)', contrast: 'var(--color-error-contrast)', hover: 'var(--color-error-hover)' },
    { signature: 'info', main: 'var(--color-info)', contrast: 'var(--color-info-contrast)', hover: 'var(--color-info-hover)' },
]);
scope.set('variants', [
    { signature: 'filled' },
    { signature: 'outlined' },
    { signature: 'text' },
]);

const processedCss = StylePreprocessor.preprocess(template, scope);

console.log(processedCss);