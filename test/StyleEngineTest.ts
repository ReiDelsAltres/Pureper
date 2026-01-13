import { JSDOM } from 'jsdom';
import StyleEngine from './../src/foundation/engine/StyleEngine.js';
import Scope from '../src/foundation/engine/Scope.js';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
const { document } = dom.window;
(global as any).document = document;
(global as any).Element = dom.window.Element;
(global as any).DocumentFragment = dom.window.DocumentFragment;

(global as any).NodeFilter = dom.window.NodeFilter;
(global as any).Node = dom.window.Node;
(global as any).CSSStyleSheet = dom.window.CSSStyleSheet;

const template = `
@supports(for: color in colors) {
    @supports(for: variant in variants) {
    :host([color="@color"][variant="@variant"]) {
        --chip-border: none;

        --chip-bg-color: @color.main;
        --chip-text-color: @color.contrast;
        --chip-hover-bg-color: @color.hover;
    }
  }
}`;

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(template);

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

const engine = new StyleEngine();
const result = engine.process(styleSheet, template, scope);

// Вывести результат
for (let i = 0; i < result.cssRules.length; i++) {
    console.log(result.cssRules[i].cssText);
}