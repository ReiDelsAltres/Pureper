import HMLEParserReborn from '../src/foundation/HMLEParserReborn.js';
import Observable from '../src/foundation/api/Observer.js';
import { JSDOM } from 'jsdom';
import { readFileSync, writeFileSync } from 'fs';

// Setup DOM env
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-ignore
globalThis.window = dom.window as any;
// @ts-ignore
globalThis.document = dom.window.document as any;

const parser = new HMLEParserReborn();

// Read phtml file from Hellper
const phtmlPath = '../Hellper/src/pages/TestingPage.phtml';
const raw = readFileSync(phtmlPath, 'utf-8');

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

// Capture logs
const logs: string[] = [];
const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
    const line = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    logs.push(line);
    originalConsoleLog.apply(console, args);
};

try {
    console.log('TestingPage parse log — start');
    console.log('File read length:', raw.length);

    // Stage 1: parse text
    const parsed = parser.parse(raw, scope);
    console.log('Parsed full text length:', parsed.length);
    console.log('Parsed result sample:');
    console.log(parsed.slice(0, 2000)); // first 2000 chars

    // Stage 2+3: DOM parsing & hydration
    const frag = parser.parseToDOM(raw, scope);
    const tBefore = frag.querySelectorAll('template').length;
    console.log('Templates before hydrate:', tBefore);

    parser.hydrate(frag, scope);
    const tAfter = frag.querySelectorAll('template').length;
    console.log('Templates after hydrate:', tAfter);

    const container = document.createElement('div');
    container.appendChild(frag);

    const hydratedHtml = container.innerHTML;
    console.log('Hydrated HTML full length:', hydratedHtml.length);
    console.log('Hydrated HTML sample:');
    console.log(hydratedHtml);

    console.log('Final textContent length:', container.textContent?.length);
} catch (e) {
    console.log('Exception during parsing/hydration:', e);
} finally {
    // restore console
    console.log = originalConsoleLog;
    const logText = logs.join('\n');
    writeFileSync('log/testingpage_full.log', logText, 'utf-8');
    console.log('Log written to log/testingpage_full.log');
}
