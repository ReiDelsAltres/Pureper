Все новые классы создай в папке где находится этот файл

# Scope
Это должен быть самодостаточный класс работающий с полями, переменными, функциями Обьекта в JavaScript.

Основной его возможностью должно быть умения обьединять *Scope* различных Обьектов в один *Scope*
Получать *Scope* из любого класса, или структуры {}

При конфликте имён должно быть записано предупреждение для откладки, и последняя переменная будет иметь приоритет

Предположительным примером что должен делать Scope класс можно выделить этот код:
    private buildContext(scope?: Record<string, any>): Record<string, any> {
        const ctx: Record<string, any> = Object.assign({}, this.variables);
        if (scope) {
            // Copy own properties
            Object.assign(ctx, scope);
            // Copy prototype methods (for class instances)
            let proto = Object.getPrototypeOf(scope);
            while (proto && proto !== Object.prototype) {
                // Avoid copying host (DOM/native) prototype methods which may throw
                const ctorName = proto && proto.constructor ? String((proto as any).constructor?.name ?? '') : '';
                if (/HTMLElement|Element|Node|EventTarget|Window|GlobalThis/i.test(ctorName)) {
                    // Skip host prototypes entirely
                    proto = Object.getPrototypeOf(proto);
                    continue;
                }

                for (const key of Object.getOwnPropertyNames(proto)) {
                    if (key === 'constructor' || key in ctx) continue;

                    // Use descriptor to avoid triggering getters/accessors
                    let desc: PropertyDescriptor | undefined;
                    try {
                        desc = Object.getOwnPropertyDescriptor(proto, key) as PropertyDescriptor | undefined;
                    } catch (e) {
                        // Some host objects may throw on descriptor access — skip safely
                        continue;
                    }
                    if (!desc) continue;

                    // Only bind plain function values — don't copy getters/setters
                    if (typeof desc.value === 'function') {
                        try {
                            ctx[key] = (desc.value as Function).bind(scope);
                        } catch (e) {
                            // binding some native functions may throw; skip them
                            continue;
                        }
                    }
                }

                proto = Object.getPrototypeOf(proto);
            }
        }
        return ctx;
    }

# Observable
Используй класс *Observable*, модиффицируй если необходимо, 
это один из инструментов для динамического пересоздания в *PageTemplate*

# Expression

Создай *Expression* это специальный класс который принимает строку которая может быть
    1.JavaScript кодом - например @(encodeURIComponent(JSON.stringify(subject)))
    значит что *Expression* должен вызвать encodeURIComponent(JSON.stringify(subject)) 
    и вернуть результат значения
    2.JavaScript кодом с return - например @(const f = ""; return f;)
    3.Переменной из предоставленного *Scope* - например если в *Scope* { const z = "aaas" }
    то @(z) должно вернуть значение переменной. т.е aaas
    4.Функцией из предоставленного *Scope* -  например если в *Scope* { function do() {return 3;}}
    то @(do()) должен вернуть результат функции. т.е 3

    п.с @() не является обязательным для класса, это просто пример на основе некоторых *Rule* 

Вся логика *Expression* должна быть только внутри этого класса, он должен быть самодостаточным даже без *TemplateEngine*
принимать любую строку и обрабатывать ёё

# Rule
Это класс привязанный к *TemplateEngine* и представляет собой отдельный элемент модиффикаций html кода который *TemplateEngine* 
сможет обработать

*Rule* должны поддерживать сбалансированные блоки {}, (). т.е корректно обрабатывать множество вложенных блоков, например
@(encodeURIComponent(JSON.stringify(subject))) = *Rule* должно чётко обработать весь блок, и корректно обработать все вложенные скобки
3 открывающие скобки - 3 закрывающие скобки

Есть 2 типа *Rule*:
1. *Атрибутативные Rule* - rule которые могут быть установленны только как атрибут для html компонента
2. *Синтаксические Rule* - rule которые могут быть обозначены в любом месте кроме атрибутов html компонента


Синтаксические Rule могут быть вложенными друг в друга, например:
@for(var in collection) {
    @for(var1 in var.values) {

    }
}
Rule которые используют блоки {} и способны создавать локальные значения, например @for должны создавать *Локальный Scope* на основе
*Общего Scope* + Локальные переменные из Rule (Для этого должны использоватся внутренние возможности *Scope*)

Rule которые находятся внутри блока другого Rule должны получать *Локальный Scope*, например:
@for(var in collection) {
    @(var)
}

# TemplateEngine class
TemplateEngine это класс который будет получать string содержащий в себе модиффицированный html-код и *Scope*, обработать все поддерживаемые модификации *Rule* и создать класс *PageTemplate* который будет содержать 

*TemplateEngine* должен использовать *Scope* двух типов:
1. *Общий Scope* - это *Scope* который предоставляется *TemplateEngine* в конструктор и является главным и общим
2. *Локальный Scope* - это *Scope* имеющий поля и *Общего Scope* и локальные переменные

*TemplateEngine* должен в результате своей работы создавать класс *PageTemplate* который должен будет проводить, вносить изменения
в шаблон по требованию и выдавать готовый результат

в *TemplateEngine* в конструкторе должны быть настройки для настройки некоторых параметров, например:
1. showAttributeRule - должно оставлять синтаксис *Атрибутативных Rule* в финальном html

*TemplateEngine* должен отслеживать когда используемое в *Scope* значение, или *Expression* возвращают *Observable*,
если *Observable* изменится то *PageTemplate* автоматически должен пересоздавать зависимый кусок кода (используй subscribe), например:

@for(var in observableCollection) {
    @(var)
}

при observableCollection.setObject(*new value*) *PageTemplate* должен вызывать event
onTemplateChange(oldValue, newValue, oldTemplate, newTemplate) - на который так же можно подписатся или отписатся, и менять
внутренне значение template

# PageTemplate
*PageTemplate* это класс который представляет собой динамический шаблон страницы, он должен создаватся в *TemplateEngine*,
в нём должны хранится все *Rule* и html код на который они вляют, например:

@For (var in collection) {
    <div>@(var)</div>
}

Должен сохранить код <div>@(var)</div> потому что он внутри блока Rule и по требованию (например если collection изменится) провести пересоздание этой ветки DOM (не всего html-кода ,а только часть которая зависима от Rule)

Под пересозданием ветки DOM подразумевается пересоздание локального DocumentFragment хранящегося в *PageTamplate* для последующего внедрения в основной DOM

Важное замечание: Если один *Rule* вложен в другой *Rule* то пересоздание внешнего *Rule* должно пересоздать всё внутри, 
в том числе и внутренние *Rule* т.е всё что находится {}

# Список Rule:
    Атрибутативные Rule:
        1)@[ref]="Expression" - результат Expression должен быть *Названием переменной*
            это правило должно добавить в общий Scope TemplateEngine html элемент в котором находится этот тег
            под именем *Название переменной*

            Expression в @[ref] должен throw InvalidDynamicRuleUsage если Expression возвращает *Observable*
        2)@on[*Event*]="Expression"
            это правило должно подписать компонент в котором находится этот тэг на событие *Event*
            например @on[click]="handleClick(event)" должно подписать функцию handleClick(event) из Scope для выполнения на событие click

            event должен быть опциональным параметром который может использовать Expression, так же как
            и обычные ивенты

            Если Expression возвращает *Observable* то при его изменении, старый Event должен отписыватся, и подписыватся заного
            с новыми значениями т.е правило должно выполнятся заного 
        3)@injection[*type*]="Expression" - результат Expression должен быть *Названием переменой* которая является    
            HTMLElement 
            *type* - может быть head, tail
            это правило должно найти найти в Scope html элемент (Цель) (обычно созданный с использованием @[ref]) с именем *Название переменной*, и добавить html элемент в котором обозначен этот тэг (Инжектируемый) в
            в (Цель)
            Например:
            <div @[ref]="'injectionTarget'"></div>
            <div @injection[head]="'injectionTarget'"></div>

            в результате должен быть:
            <div @[ref]="'injectionTarget'">
                <div @injection[head]="'injectionTarget'"></div>
            </div>

            Expression в @injection должен throw InvalidDynamicRuleUsage если Expression возвращает *Observable*
    Синтаксические Rule:
        1)@(Expression) - должен вызывать Expression, и если результат Expression не void на своём месте оставлять string
        Например если в Scope { value = "result" }:
        <div>@(value)</div>

        в результате:
        <div>result</div>
        2)@If(Expression) {*Block*} - Expression должен возвращать boolean иначе throw InvalidTemplateEngineSyntaxException,
            должен работать как стандартный if
        Например если в Scope { value = null };
            @if (value == null) {
                <div></div>
            }
        в результате будет 
        <div></div>
        3)@For Все вариации:
            1.@For (*localVariable* in Expression) {
                    <div>....</div>
                }
                *localVariable* - название переменной которая добавится в локальный Scope для всех вложенных Rule,
                является текущей переменной из коллекции
                Expression - должно возвращать коллекцию итерируемых элементов
            2.@For (*localIndex*, *localVariable* in Expression) {
                    <div>....</div>
                }
                *localVariable* - название переменной которая добавится в локальный Scope для всех вложенных Rule,
                является текущей переменной из коллекции
                *localIndex* - индекс итерации от 0 до колво элементов в *Collection*
                Expression - должно возвращать коллекцию итерируемых элементов *Collection*
            3.@For (*localNumber* in Expression) {
                    <div>....</div>
                }
                Expression - должно вернуть число *finalNumber*
                *localNumber* -  название переменной добавится в локальный Scope для всех вложенных Rule
                является числом от 0 до *finalNumber*


# Уточнения Expression
Если код содержит return то он должен оборачиватся в анонимную функцию и выполнятся

- Объединить пункты 1-4 в один: "Expression выполняет JS-код в контексте Scope"
- Добавить: явное указание как детектить `return` (regex на `return\s+`)

# Уточнения Rule
Rule должен полностью игнорировать любые коментарии

# Общие уточнения
@For и @for одинаково валидны и должны поддерживатся оба варианта
как и @If = @if

Что бы вывести литерал @ нужно использовать @@, @@ всегда становится @,
если @@@@ то это будет @@

Вложенность Expression недопустима, всё что внутри блока () в любом Rule не может использовать
@ т.е @for (var in @collection) недопустима так же

Observable + @[ref]: если в результате пересоздания @[ref] не был добавлен в DOM, то он должен стать null,
если он по какой то причине отсутствует в DOM он должен быть null

@injection должен выполнятся в самую последнюю очередь, в отдельном этапе предназначенном для рефлекции и пост обработки

Nested Observable: Если @for(item in observable) и внутри @(item.subObservable) — нужно ли отслеживать вложенные Observable? - Да, но если в результате пересоздания этот subObservable исчез, например при @if,
то он должен перестать отслеживатся

Whitespace handling — @for(...) { с переносом строки — сохранять whitespace внутри блока? - Да
Async Expression — поддержка await в Expression? @(await fetchData()) - Да


@else / @elseif — да, общий синтаксис должен быть примерно таким:

@if(Expression) {

}
@elseif(Expression) {

}
@else {

}

@elseif должен быть опцинальным и использоватся только после @if
@else должен быть опциональным и использоватся только после @if или @elseif, в самом конце
множественные @elseif должны поддерживатся


@for(i in 5) vs @for(i in "5")	Строка "5" — итерировать символы или ошибка? Ошибка
Пустая коллекция	@for(x in []) — просто ничего не выводить? Да, ничего не выводить
@if без блока	@if(cond) <div></div> без {} — поддерживается? Нет
Самозакрывающиеся теги	<input @[ref]="myInput" /> — корректно? Да

Если требуется Observer Может быть изменён

@elseif/@else whitespace	@if(...) {} @elseif(...) — обязательны ли пробелы/переносы между блоками? Или }@elseif тоже валидно? Пробелы и переносы не обязательны

@on[event] + event параметр	Уточнить: event добавляется в локальный Scope автоматически при вызове Expression только для этого Expression

Async + Observable	Если @(await fetchData()) возвращает Observable — отслеживать? Или async не может вернуть Observable? async может вернуть только Task<Observable>

Error handling	Не указано: что делать если Expression выбрасывает исключение? Выведи подробную ошибку в консоль и продолжи выполнение кода дальше

@for числовой диапазон	@for(i in 5) — это 0,1,2,3,4;

