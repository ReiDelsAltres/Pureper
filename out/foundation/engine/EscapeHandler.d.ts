/**
 * EscapeHandler - обработка escape-последовательностей.
 * @@ -> @
 * @@@@ -> @@
 */
export default class EscapeHandler {
    /**
     * Заменить @@ на специальный placeholder перед парсингом
     */
    static escapeDoubleAt(input: string): {
        result: string;
        placeholder: string;
    };
    /**
     * Восстановить @ из placeholder после парсинга
     */
    static restoreEscapes(input: string, placeholder: string): string;
    /**
     * Полный цикл: escape -> process -> restore
     */
    static process(input: string, processor: (escaped: string) => string): string;
    /**
     * Проверить, является ли позиция escaped (предшествует @@)
     */
    static isEscaped(input: string, position: number): boolean;
}
//# sourceMappingURL=EscapeHandler.d.ts.map