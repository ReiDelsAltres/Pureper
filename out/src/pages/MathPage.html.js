import Page from '../src/foundation/component_api/Page.js';
export default class MathPage extends Page {
    async postLoadJS(element) {
        // Настройка обработчиков событий для тестовых кнопок
        this.setupTestButtons(element);
        // Принудительный рендеринг KaTeX для этой страницы
        setTimeout(() => {
            if (globalThis.KatexUtils) {
                globalThis.KatexUtils.autoRender(element);
            }
        }, 100);
    }
    setupTestButtons(element) {
        // Тест рендеринга в элемент
        const testRenderBtn = element.querySelector('#test-render-btn');
        const testOutput = element.querySelector('#test-output');
        if (testRenderBtn && testOutput) {
            testRenderBtn.addEventListener('click', () => {
                if (globalThis.KatexUtils) {
                    const formula = 'E = mc^2';
                    testOutput.innerHTML = '<p>Рендеринг формулы: ' + formula + '</p><div id="formula-result"></div>';
                    const formulaElement = testOutput.querySelector('#formula-result');
                    globalThis.KatexUtils.renderToElement(formula, formulaElement, { displayMode: true });
                }
                else {
                    testOutput.textContent = 'KatexUtils не загружен';
                }
            });
        }
        // Тест конвертации в LaTeX
        const testConvertBtn = element.querySelector('#test-convert-btn');
        const convertOutput = element.querySelector('#convert-output');
        if (testConvertBtn && convertOutput) {
            testConvertBtn.addEventListener('click', () => {
                if (globalThis.KatexUtils) {
                    const input = 'sqrt(x^2 + y^2) = integral from 0 to infinity';
                    const converted = globalThis.KatexUtils.convertToLatex(input);
                    convertOutput.innerHTML = `
                        <p><strong>Исходный текст:</strong> ${input}</p>
                        <p><strong>Конвертированный LaTeX:</strong> ${converted}</p>
                        <p><strong>Результат:</strong></p>
                        <div style="text-align: center; margin: 10px 0;">$${converted}$</div>
                    `;
                    // Рендерим конвертированную формулу
                    globalThis.KatexUtils.autoRender(convertOutput);
                }
                else {
                    convertOutput.textContent = 'KatexUtils не загружен';
                }
            });
        }
        // Тест валидации формул
        const testValidateBtn = element.querySelector('#test-validate-btn');
        const validateOutput = element.querySelector('#validate-output');
        if (testValidateBtn && validateOutput) {
            testValidateBtn.addEventListener('click', () => {
                if (globalThis.KatexUtils) {
                    const formulas = [
                        'x^2 + y^2 = z^2', // валидная
                        '\\frac{a}{b}', // валидная
                        'invalid{formula', // невалидная
                        '\\sum_{i=1}^n i^2', // валидная
                        '\\invalid\\command' // невалидная
                    ];
                    let results = '<h3>Результаты валидации:</h3><ul>';
                    formulas.forEach(formula => {
                        const isValid = globalThis.KatexUtils.validateExpression(formula);
                        const status = isValid ? '✅ Валидная' : '❌ Невалидная';
                        results += `<li><code>${formula}</code> - ${status}</li>`;
                    });
                    results += '</ul>';
                    validateOutput.innerHTML = results;
                }
                else {
                    validateOutput.textContent = 'KatexUtils не загружен';
                }
            });
        }
    }
}
//# sourceMappingURL=MathPage.html.js.map