import Scope from "./Scope.js";

export default class StyleEngine {
    private readonly VAR_PATTERN = /@([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;

    public constructor() { }

    public process(style: CSSStyleSheet, template: string, scope: Scope): CSSStyleSheet {
        const newStyle = new CSSStyleSheet();
        const forRules = new Set<CSSRule>();

        const walker = new CSSWalker((walkerr, rule, data) => {
            if ('conditionText' in rule && rule.conditionText) {
                const conditionText: string = rule.conditionText as string;
                const forRegex = /for:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*in\s*([a-zA-Z_][a-zA-Z0-9_]*)/;
                if (forRegex.test(conditionText)) {
                    forRules.add(rule);

                    const match = forRegex.exec(conditionText);
                    const itemName = match![1];
                    const listName = match![2];

                    const list = data!.get(listName) as any[];
                    if (!Array.isArray(list)) {
                        console.warn(`[StyleEngine] ${listName} is not an array`);
                        return;
                    }

                    for (let index = 0; index < list.length; index++) {
                        const item = list[index];
                        const nestedScope = data!.createChild();
                        nestedScope.set(itemName, item);
                        nestedScope.set('index', index);

                        if ('cssRules' in rule && rule.cssRules)
                            walkerr.walk(rule.cssRules as CSSRuleList, nestedScope);
                    }
                    return; // Don't walk children normally
                }
            }
            // Walk nested rules normally
            if ('cssRules' in rule && rule.cssRules) {
                walkerr.walk(rule.cssRules as CSSRuleList, data);
            }
        });

        walker.onLeave((rule, data) => {
            // Skip for-loop container rules
            if (forRules.has(rule)) return;

            // Interpolate variables in the rule
            const interpolatedCss = this.interpolate(rule.cssText, data!);
            
            try {
                newStyle.insertRule(interpolatedCss, newStyle.cssRules.length);
            } catch (e) {
                console.warn('[StyleEngine] Failed to insert rule:', interpolatedCss, e);
            }
        });

        walker.walk(style.cssRules, scope);
        return newStyle;
    }

    /**
     * Интерполяция переменных @var и @var.property
     */
    private interpolate(text: string, scope: Scope): string {
        return text.replace(this.VAR_PATTERN, (match, path) => {
            const value = this.resolvePath(path, scope);
            if (value === undefined) {
                return match; // Keep original if not found
            }
            // Если это объект - пытаемся получить signature или toString
            if (value !== null && typeof value === 'object') {
                if ('signature' in value) {
                    return String(value.signature);
                }
                if ('name' in value) {
                    return String(value.name);
                }
                if ('id' in value) {
                    return String(value.id);
                }
            }
            return String(value);
        });
    }

    /**
     * Разрешить путь вида "item.property.subproperty"
     */
    private resolvePath(path: string, scope: Scope): any {
        const parts = path.split('.');
        let value: any = scope.get(parts[0]);

        for (let i = 1; i < parts.length; i++) {
            if (value === undefined || value === null) {
                return undefined;
            }
            value = value[parts[i]];
        }

        return value;
    }
}

export class CSSWalker {
    private onEnterCallbacks: ((rule: CSSRule, data?: Scope) => void)[] = [];
    private onLeaveCallbacks: ((rule: CSSRule, data?: Scope) => void)[] = [];

    private walkerFunction?: (walker: CSSWalker, rule: CSSRule, data?: Scope) => void;

    public constructor(walkerFunction?: (walker: CSSWalker, rule: CSSRule, data?: Scope) => void) {
        this.walkerFunction = walkerFunction;
    }

    public walk(rules: CSSRuleList, data?: Scope) {
        for (const rule of rules) {
            this.onEnterCallbacks.forEach(cb => cb(rule, data));

            if (this.walkerFunction) {
                this.walkerFunction(this, rule, data);
            } else {
                // Default: walk nested rules
                if ('cssRules' in rule && rule.cssRules) {
                    this.walk(rule.cssRules as CSSRuleList, data);
                }
            }

            this.onLeaveCallbacks.forEach(cb => cb(rule, data));
        }
    }

    public onEnter(callback: (rule: CSSRule, data?: Scope) => void) {
        this.onEnterCallbacks.push(callback);
    }

    public onLeave(callback: (rule: CSSRule, data?: Scope) => void) {
        this.onLeaveCallbacks.push(callback);
    }
}