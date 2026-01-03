/**
 * EscapeHandler - обработка escape-последовательностей.
 * @@ -> @
 * @@@@ -> @@
 */
export default class EscapeHandler {
    /**
     * Заменить @@ на специальный placeholder перед парсингом
     */
    static escapeDoubleAt(input) {
        // Use a unique placeholder that won't appear in normal code
        const placeholder = '\x00AT_ESCAPE\x00';
        const result = input.replace(/@@/g, placeholder);
        return { result, placeholder };
    }
    /**
     * Восстановить @ из placeholder после парсинга
     */
    static restoreEscapes(input, placeholder) {
        return input.replace(new RegExp(placeholder.replace(/\x00/g, '\\x00'), 'g'), '@');
    }
    /**
     * Полный цикл: escape -> process -> restore
     */
    static process(input, processor) {
        const { result: escaped, placeholder } = this.escapeDoubleAt(input);
        const processed = processor(escaped);
        return this.restoreEscapes(processed, placeholder);
    }
    /**
     * Проверить, является ли позиция escaped (предшествует @@)
     */
    static isEscaped(input, position) {
        if (position === 0)
            return false;
        // Count consecutive @ before this position
        let count = 0;
        let i = position - 1;
        while (i >= 0 && input[i] === '@') {
            count++;
            i--;
        }
        // If odd number of @ before, this @ is escaped
        return count % 2 === 1;
    }
}
//# sourceMappingURL=EscapeHandler.js.map