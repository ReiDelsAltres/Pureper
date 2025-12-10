HMLEParser должен парсить строки с модиффицированным html кодом(HMLE) в html,
все особенности синтаксиса должны определятся Правилами

# Expression
Expression<T> это JavaScript code который должен быть выполнен

Все переменные могут быть получены как прямо из scope по названию переменной или через исполнения Expression<T> в которой T возвращаемое значение 

# Observable
Observable<T> это обьект изменения которого должны notify() listeners

Если переменная поставляемая в правила Observable то всё правило должно становится динамическим и обновлятся при изменении Observable

# Rule
Rule это обьект внутри HMLEParser который представляет собой отдельное правило, со своей проверкой и execution
Правило может накладыватся на все 3 этапа работы парсера, а может и на какой то конкретный


Правило считается ДИНАМИЧЕСКИМ если оно взаимодействует с Observable<> любыми способами, или взаимодействует с переменными которые были созданы в динамическом блоке например если  @for интерируется от  Observable то любое правило использующее value и index тоже считается динамическим и должно пропускать первый этап 

# Принцип работы
Парсер должен проводится в 3 этапа:
1.Парсинг - парсить HMLE как текст, выполнять СТАТИЧЕСКИЕ ПРАВИЛА
2.DOM Парсинг - Парсить HMLE текст в DOM, и создавать <template> для динамических правил
    Созданные <template> должны быть сохранены для того что бы их можно было переиспользовать при обновлении Observable
3.Гидратация - Удалять <template> и выполнять динамические правила 

Каждый этап должен быть чётко определён и парсер должен уметь выполнять каждый отдельно

# Правила
1) Правило exp
# Синтаксис:
@(expression or variable)

# Поведение по этапам
1) Парсинг
    1.Если внутри @() находится variable то на месте @() в HTML должно появится значение этой премененной
        Например: в scope { str="value"}    @(str)  то в результате  value
    2.Если внутри @() находится Expression<string> то на месте должен отобразится строка
    3.Если внутри @() находится Expression<void> то на expression должен выполнится но ничего не отобразится
    4.Если внутри @() находится Expression<any> то any должен быть преобразован в строку и отобразится
2) DOM Парсинг
    1.Если внутри @() находится Observable<any> то на месте должно создаватся <template exp var="variable name"></template>
    2.Если внутри @() Expression<any> использует Observable<any> то на место должно создаватся <template exp expr="expression"></template> 
3) Гидратация 
    1.<template exp var="variable name"></template> должно быть заменено на variable value
    2.<template exp expr="expression"></template> expression должно быть выполнено а результат записан, если он есть

2) Правило for:
# Синтаксис:
1) @for (index, value in values) {} 
2) @for (value in values) {}
    - index - Опциональный - это индекс интерации цикла for,
    - value - это значение итерации коллекции values, 
    - values - должна быть получена из scope предварительно - any Collection or Expression<any Collection>
3) @for (i in number) {}
    - i - число от 0 до number в итерации
    - number - должна быть получена из scope предварительно - это число обозначающее сколько раз цикл совершится - number or Expression<number>

# Поведение по этапам
1) Парсинг
    1.Если values коллекция элементов то всё что внутри {} должно быть скопированно для каждой итерации
    2.Если number это число то {} всё скопированно для каждой итерации
2) DOM Парсинг
    1.Если values это Observable<any Collection or Number> то на месте должно создаватся <template for index="i" var="value" in="values">{Содержимое блока for}</template> 
    2.Если values это Expression<any Collection or Number> который использует Observable<ny Collection or Number> то на месте должно создаватся <template for index="i" var="value" in-expr="expression">{Содержимое блока for}</template>
3) Гидратация
    1.<template for index="i" var="value" in="values">{Содержимое блока for}</template> должно быть заменено на содержимое блока скопированное для каждой итерации
    2.<template for index="i" var="value" in-expr="expression">{Содержимое блока for}</template> должно быть заменено на содержимое блока скопированное для каждой итерации

Пример:
@for (i,question in questions) {
    <div>@(i) - @(question)</div>
} при questions = new Observable(["A1", "A2", "A3"]);

Должно создаватся:
    <template for index="i" var="question" in="questions">
        <div><template exp var="i"></template> - <template exp var="question"></template></div>
    </template>

А после всех обработок:
    <div>0 - A1</div>
    <div>1 - A2</div>
    <div>2 - A3</div>

Если:
@for (index, value in values) {
    @for(index1, value1 in value.params) {

    }
}

то 

<template for index="index" var="value" in="values">
    <template for index="index1" var="value1" in="value.params">
    </template>
</template>

3) Правило @[ref]
# Синтаксис
<any-htmltag @[ref]="name">

Парсер должен создавать перменную с именем name
Переменная должна равнятся html-элементу
Созданная переменная должна быть выведена в общий scope

Правило должно выполнятся на этапе 2. DOM парсинг

4) Правило @[on-название события] 
см. HMLEParser для примера
# Синтаксис
 <any-htmltag @[on-название события]="expression">

expressions - должны содержать в scope событие и сам элемент в котором находится правило

Пример: <any-htmltag @[onclick]="doSomething(event, element)">
