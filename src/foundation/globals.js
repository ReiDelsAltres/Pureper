// Global exposure of core classes for simpler usage without repetitive imports.
import Component from './Component.js';
import Page from './Page.js';

// Attach to globalThis so modules can reference via globalThis.Component / globalThis.Page
globalThis.Component = Component;
globalThis.Page = Page;

// (No exports needed; side-effect module)
