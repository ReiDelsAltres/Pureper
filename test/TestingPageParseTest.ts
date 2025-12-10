import HMLEParserReborn from '../src/foundation/HMLEParserReborn.js';
import Observable from '../src/foundation/api/Observer.js';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

// Setup DOM env
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-ignore
globalThis.window = dom.window as any;
// @ts-ignore
globalThis.document = dom.window.document as any;

function assert(cond: boolean, message?: string) {
    if (!cond) throw new Error('Assertion failed' + (message ? ': ' + message : ''));
}

const parser = new HMLEParserReborn();

console.log('TestingPage parse test — start');

// Read phtml file from Hellper
const phtmlPath = '../Hellper/src/pages/TestingPage.phtml';
const raw = readFileSync(phtmlPath, 'utf-8');
console.log('File read, length', raw.length);

// Provide semestrs data in scope
const semestrsObs = new Observable([
    {
        number: 'I',
        subjects: [
            { translatedName: 'Mathematics', name: 'math', teacher: 'Prof. Ivanov', groups: ['A', 'B'] },
            { translatedName: 'Physics', name: 'physics', teacher: 'Dr. Petrov', groups: ['A'] }
        ]
    },
    {
        number: 'II',
        subjects: [
            { translatedName: 'Chemistry', name: 'chem', teacher: 'Dr. Sidorov', groups: ['C'] }
        ]
    }
]);

const scope: any = {
    semestrs: semestrsObs,
    encodeURIComponent,
    JSON
};

// Stage 1: parse text
const parsed = parser.parse(raw, scope);
console.log('Parsed sample (first 300 chars):');
console.log(parsed.substring(0, 300) + '...');

// Should not leave stray closing '}' after tags
assert(!/>\s*\}/.test(parsed), 'No stray closing brace after tags in parsed text');

// Stage 2+3: DOM parsing & hydration
const frag = parser.parseToDOM(raw, scope);
// Count templates before hydrate
const tBefore = frag.querySelectorAll('template').length;
console.log('Templates before hydrate:', tBefore);
parser.hydrate(frag, scope);
const tAfter = frag.querySelectorAll('template').length;
console.log('Templates after hydrate:', tAfter);
assert(tAfter === 0, 'All templates should be hydrated');

// Append to container and inspect
const container = document.createElement('div');
container.appendChild(frag);

console.log('Hydrated HTML (first 500 chars):');
console.log(container.innerHTML.substring(0, 500) + '...');

// Verify content present
assert(container.textContent?.includes('Testing Page'), 'Header should contain "Testing Page"');
assert(container.textContent?.includes('Semestr I'), 'Should render Semestr I');
assert(container.textContent?.includes('Mathematics'), 'Should render subject Mathematics');
assert(container.textContent?.includes('Prof. Ivanov'), 'Should render teacher');
assert(container.textContent?.includes('A'), 'Should render group A');
// The href with encoded JSON should be present somewhere; check string
assert(container.innerHTML.includes('/testing/sub?subject='), 'Href-to-testing predicate should be present');

// Ensure no stray '}' after tags in final html
assert(!/>\s*\}/.test(container.innerHTML), 'No stray brace after tags in hydrated HTML');

console.log('TestingPage parse test — passed');
