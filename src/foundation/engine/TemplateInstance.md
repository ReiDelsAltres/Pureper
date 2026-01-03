Проанализируй текущий код TemplateInstance, Переделай TemplateInstance

# Предположительный пример структуры и работы

Должен содержать множество различных мелких фрагментов, и при обновлении rebuild-ить только те на которые изменения повлияли, т.е
Если:
<div>@(observable1)</div> 
<div>@(observable2)</div> 

должно создатся 2 фрагмента
1. <div>@(observable1)</div> - пересоздастся только при изменении observable1, изменения observable2 не повлияют на него
2. <div>@(observable2)</div> - пересоздастся только при изменении observable2, изменения observable1 не повлияют на него

---

Если:
<div>@(observable1) и @(observable2)</div> то изменения observable1 и изменение observable2 должны влиять

здесь 1 фрагмент:
1. <div>@(observable1) и @(observable2)</div> #id1

---

Если:
<div @[ref]="'outer'">
    <span>@(observable1)</span>
    <span>@(observable2)</span>
    @for (observableVar in observableCollection) {
        <span>@(observableVar)</span>
    }
</div>

здесь 5+ фрагментов:
1.  <div @[ref]="'outer'"> #id1
        #id2
        #id3
        #id4
    </div>
2.  <span>@(observable1)</span> #id2
3.  <span>@(observable2)</span> #id3
4.  *RuleFragment* @for (observableVar in observableCollection) { #id5 } #id4
5+  <span>@(observableVar)</span> #id5

3 отдельных фрагмента (#id5-a, #id5-b, #id5-c), каждый обновляется независимо

Если изменится observable1 то пересоздастся должен только #id2
Если изменится observableCollection то пересоздастся должен #id4 и соответсвенно это коснётся и вложенного в него #id5
Измеения в var в #id5 должно пересоздать только #id5


Если Scope { observable1 = new Observable(1), 
    observable1 = new Observable(2), 
    observableCollection = new Observable([55,56,57]) }

то результат будет выглядеть так:

<div id="'outer'">
    <span>1</span>
    <span>2</span>
    <span>55</span>
    <span>56</span>
    <span>57</span>
</div>

но при изменении observable1.setObject(999) то результат станет:

<div id="'outer'">
    <span>999</span>
    <span>2</span>
    <span>55</span>
    <span>56</span>
    <span>57</span>
</div>

если TemplateInstance имеет биндинг с контейнером, то аналогичные изменения должны происходить и в контейнере

---



изменения observable1 повлияет только на #id1
изменения observabıe2 повлияет только на #id2

TemplateInstance должен иметь эмитить ивенты на которые можно подписатся
onFragmentChange(event: FragmentChangeEvent)

должен иметь методы
bindRefs() - должен создавать в Scope переменные из @[ref] правила
unbindRefs() - должен удалять из Scope переменные из @[ref] правила (приравнивать к null)

bindEvents() - должен добавлять обработчик событий к html-element из @on[event] правила
unbindEvents() - должен удалять обработчик событий из html-element по @on[event] правилу

bind(container) - должен связывать внутреннюю DOM структуру с container, должен вставлять DOM в container
unbind(container) - должен удалять связь внутренней DOM структуры с container, оставляет элементы в container, но при изменении в TemplateInstance container уже не должен меняется

Если существует binding с container то изменения внутри TemplateInstance должны так же отражатся и на container,
удаление и добавление ивентов, динамическое обновление и пересоздание фагментов, 

TemplateInstance может иметь множество контейнеров binding-ов

bind(container) - должен автоматически вызывать bindRefs,bindEvents
unbind(container) - должен автоматически вызывать unbindRefs,unbindEvents

# Уточнения
1. Архитектурная проблема — TemplateEngine не создаёт фрагменты:
Сейчас TemplateEngine.parse() возвращает один общий результат. Разбиение на фрагменты по Observable не происходит. Нужно менять логику парсинга. Изменения TemplateEngine приемлимы если требуются



