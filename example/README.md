# HMLE Parser Example

Interactive demo page for testing HMLEParserReborn.

## Running the Example

Since the example uses ES modules, you need to serve it via HTTP:

```bash
cd example
npx serve ..
```

Then open http://localhost:3000/example/ in your browser.

## Features Demonstrated

### Observable Reactivity
- **User Observable** - Update the user name and see it reflected instantly
- **Tasks Observable** - Add, remove, toggle, and shuffle tasks with full reactivity

### HMLE Syntax
- `@(expression)` - Inline expressions with Observable support
- `@for (idx, item in array)` - Loops with index and value
- Nested `@for` - Tags inside tasks demonstrate nested loops
- Dynamic classes - `@(task.completed ? 'completed' : '')`

### Controls
- **Update User** - Changes the user Observable
- **Add Task** - Adds a new task to the tasks Observable  
- **Toggle First Task** - Toggles completion status of first task
- **Remove Last Task** - Removes the last task from the array
- **Shuffle Tasks** - Randomly reorders all tasks

## Code Structure

```javascript
// Observable state
const userObs = new Observable({ name: 'John', role: 'Developer' });
const tasksObs = new Observable([...]);

// HMLE Template
const template = `
  <h1>Hello, @(formatUser(user))</h1>
  @for (idx, task in tasks) {
    <li>@(task.title)</li>
  }
`;

// Parse and hydrate
const dom = parser.parseToDOM(template, scope);
parser.hydrate(dom, scope);
```
