# Design Document: Todo Dashboard

## Overview

The Todo Dashboard is a single-page personal productivity application delivered as a static web page. It runs entirely in the browser with no server, no build step, and no external dependencies. All state is held in memory during a session and synced to `localStorage` on every mutation.

The application is composed of five independent widgets rendered in a CSS Grid layout:

- **Greeting Widget** — displays current time, date, and a time-of-day greeting with optional personalized name
- **Focus Timer** — a 25-minute Pomodoro countdown timer with start/stop/reset controls
- **Todo List** — a CRUD task manager with duplicate detection and inline editing
- **Quick Links** — a user-curated set of one-click URL shortcuts
- **Theme Toggle** — a persistent light/dark mode switch

The design prioritises simplicity: one HTML file, one CSS file (`css/style.css`), one JavaScript file (`js/app.js`), and zero runtime dependencies.

---

## Architecture

### Single-Page Application Model

The application follows a **widget-based, event-driven architecture** without a virtual DOM or reactive framework. Each widget owns its own DOM subtree, its own state slice, and its own render function. A thin shared layer handles LocalStorage I/O and theme application.

```
index.html
├── css/
│   └── style.css          # All styles, CSS custom properties for theming
└── js/
    └── app.js             # All application logic
```

### Module Organisation (within `app.js`)

`app.js` is structured as a series of immediately-invoked module objects (plain object literals with methods), keeping concerns separated without requiring ES modules or a bundler:

```
app.js
├── Storage        — thin wrapper around localStorage (get/set/remove)
├── State          — in-memory application state + mutation helpers
├── GreetingWidget — time/date display, name input, greeting logic
├── TimerWidget    — Pomodoro countdown, interval management
├── TodoWidget     — task CRUD, duplicate detection, inline edit
├── LinksWidget    — quick link CRUD, URL validation
├── ThemeWidget    — theme toggle, CSS class application
└── App.init()     — bootstraps all widgets on DOMContentLoaded
```

### Data Flow

```
User Interaction
      │
      ▼
Widget Event Handler
      │
      ├─► State mutation (in-memory)
      │
      ├─► Storage.set(key, value)   ← fire-and-forget, errors swallowed
      │
      └─► Widget.render()           ← re-renders only the affected widget
```

There is no global re-render. Each widget renders itself independently. This keeps UI updates fast and avoids unnecessary DOM churn.

### Initialisation Sequence

```
DOMContentLoaded
  1. Storage.loadAll()          — read all four keys from localStorage
  2. ThemeWidget.init()         — apply saved/default theme immediately
  3. GreetingWidget.init()      — render time/date/greeting, start clock tick
  4. TimerWidget.init()         — render 25:00, wire up buttons
  5. TodoWidget.init()          — restore tasks, render list
  6. LinksWidget.init()         — restore links, render buttons
```

Theme is applied first (step 2) to prevent a flash of the wrong theme before other content renders.

---

## Components and Interfaces

### Greeting Widget

**Responsibilities:** Display current local time (HH:MM), current date ("Weekday, DD Month YYYY"), a time-of-day greeting, and an optional personalised name.

**DOM Structure:**
```html
<section id="greeting-widget">
  <div id="greeting-time">14:32</div>
  <div id="greeting-date">Monday, 26 May 2025</div>
  <div id="greeting-message">Good Afternoon, Alex</div>
  <form id="greeting-form">
    <input id="greeting-name-input" type="text" maxlength="100" placeholder="Enter your name">
    <button type="submit">Save</button>
  </form>
</section>
```

**Interface:**
```js
GreetingWidget = {
  init()           // restore name, render, start setInterval(tick, 60000)
  tick()           // update time display every minute
  render()         // rebuild greeting-message text
  saveName(name)   // persist to Storage, re-render
  getGreeting(hour) // pure function: hour → greeting string
  formatTime(date)  // pure function: Date → "HH:MM"
  formatDate(date)  // pure function: Date → "Weekday, DD Month YYYY"
}
```

**Greeting Logic:**

| Hour range | Greeting |
|---|---|
| 05:00 – 11:59 | Good Morning |
| 12:00 – 17:59 | Good Afternoon |
| 18:00 – 21:59 | Good Evening |
| 22:00 – 04:59 | Good Night |

The clock tick uses `setInterval` with a 60-second interval. On init, the time is rendered immediately so the user sees the correct time before the first tick fires.

---

### Focus Timer Widget

**Responsibilities:** Implement a 25-minute Pomodoro countdown with start, stop, and reset controls. Disable buttons contextually to prevent invalid states.

**DOM Structure:**
```html
<section id="timer-widget">
  <div id="timer-display">25:00</div>
  <div id="timer-notification" hidden>Time's up! Take a break.</div>
  <div id="timer-controls">
    <button id="timer-start">Start</button>
    <button id="timer-stop" disabled>Stop</button>
    <button id="timer-reset">Reset</button>
  </div>
</section>
```

**Interface:**
```js
TimerWidget = {
  init()           // render 25:00, wire button events
  start()          // begin setInterval(countdown, 1000), update button states
  stop()           // clearInterval, update button states
  reset()          // clearInterval, restore 25:00, hide notification
  countdown()      // decrement remaining seconds, check for 00:00
  render()         // update timer-display text
  formatTime(secs) // pure function: total seconds → "MM:SS"
}
```

**State:**
```js
timerState = {
  remaining: 1500,   // seconds (25 * 60)
  intervalId: null,  // setInterval handle
  running: false
}
```

**Button State Matrix:**

| Timer state | Start | Stop | Reset |
|---|---|---|---|
| Idle (25:00) | enabled | disabled | enabled |
| Running | disabled | enabled | enabled |
| Paused | enabled | disabled | enabled |
| Finished (00:00) | disabled | disabled | enabled |

---

### Todo Widget

**Responsibilities:** Full CRUD for tasks, duplicate detection (case-insensitive, trimmed), inline editing, LocalStorage persistence, and inline validation messages.

**DOM Structure:**
```html
<section id="todo-widget">
  <form id="todo-form">
    <input id="todo-input" type="text" maxlength="200" placeholder="Add a task…">
    <button type="submit">Add</button>
  </form>
  <p id="todo-error" role="alert" hidden></p>
  <ul id="todo-list">
    <!-- rendered by TodoWidget.render() -->
    <li data-id="uuid">
      <span class="task-text">Buy groceries</span>
      <button class="btn-done">Done</button>
      <button class="btn-edit">Edit</button>
      <button class="btn-delete">Delete</button>
    </li>
  </ul>
</section>
```

**Interface:**
```js
TodoWidget = {
  init()                    // restore tasks from State, render
  addTask(description)      // validate, deduplicate, push to State, persist, render
  deleteTask(id)            // remove from State, persist, render
  toggleTask(id)            // flip done flag, persist, render
  beginEdit(id)             // replace task <li> with inline edit form
  saveEdit(id, description) // validate, deduplicate (excluding self), update State, persist, render
  cancelEdit(id)            // restore original <li> without changes
  render()                  // rebuild #todo-list from State.tasks
  showError(msg)            // display #todo-error, auto-hide after 4s
  validate(description, excludeId?) // returns { valid, error }
  isDuplicate(description, excludeId?) // case-insensitive trimmed comparison
}
```

**Task Object:**
```js
{
  id: "uuid-v4-string",
  text: "Buy groceries",
  done: false
}
```

**Validation Rules:**
- Description must not be empty after trimming
- Description must be ≤ 200 characters
- Description must not match any existing task (case-insensitive, trimmed) — excluding self during edit

---

### Quick Links Widget

**Responsibilities:** CRUD for URL shortcuts, URL format validation, max 20 links, open links in new tab.

**DOM Structure:**
```html
<section id="links-widget">
  <form id="links-form">
    <input id="link-label-input" type="text" maxlength="50" placeholder="Label">
    <input id="link-url-input" type="text" maxlength="2048" placeholder="https://…">
    <button type="submit">Add</button>
  </form>
  <p id="links-error" role="alert" hidden></p>
  <div id="links-list">
    <!-- rendered by LinksWidget.render() -->
    <div class="link-entry" data-id="uuid">
      <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
      <button class="btn-delete-link">×</button>
    </div>
  </div>
</section>
```

**Interface:**
```js
LinksWidget = {
  init()               // restore links from State, render
  addLink(label, url)  // validate, push to State, persist, render
  deleteLink(id)       // remove from State, persist, render
  render()             // rebuild #links-list from State.links
  showError(msg)       // display #links-error
  validate(label, url) // returns { valid, error }
}
```

**Link Object:**
```js
{
  id: "uuid-v4-string",
  label: "GitHub",
  url: "https://github.com"
}
```

**Validation Rules:**
- Label must not be empty, must be ≤ 50 characters
- URL must not be empty, must be ≤ 2048 characters
- URL must begin with `http://` or `https://`
- Total links must be < 20 before adding

All link anchors use `target="_blank" rel="noopener noreferrer"` for security.

---

### Theme Widget

**Responsibilities:** Toggle light/dark theme, persist preference, apply on load.

**DOM Structure:**
```html
<button id="theme-toggle" aria-label="Switch to dark mode" style="min-width:24px;min-height:24px">
  🌙
</button>
```

**Interface:**
```js
ThemeWidget = {
  init()          // load saved theme, apply, update toggle label
  toggle()        // flip theme, apply, persist
  apply(theme)    // add/remove 'dark' class on <body>
  persist(theme)  // Storage.set('theme', theme)
}
```

**Theme Application:** A single `dark` CSS class on `<body>` drives all theme changes via CSS custom properties:

```css
:root {
  --bg: #ffffff;
  --text: #1a1a1a;
  --surface: #f5f5f5;
  --accent: #4a6cf7;
}
body.dark {
  --bg: #1a1a2e;
  --text: #e0e0e0;
  --surface: #16213e;
  --accent: #7b9ef7;
}
```

---

## Data Models

### LocalStorage Schema

All data is stored as JSON strings under four fixed keys.

#### `"tasks"` — Array of Task objects

```json
[
  { "id": "a1b2c3d4-...", "text": "Buy groceries", "done": false },
  { "id": "e5f6g7h8-...", "text": "Read chapter 3", "done": true }
]
```

#### `"links"` — Array of Link objects

```json
[
  { "id": "i9j0k1l2-...", "label": "GitHub", "url": "https://github.com" },
  { "id": "m3n4o5p6-...", "label": "MDN", "url": "https://developer.mozilla.org" }
]
```

#### `"greeting_name"` — String

```json
"Alex"
```

#### `"theme"` — String enum

```json
"light"
```
or
```json
"dark"
```

### In-Memory State

```js
const State = {
  tasks: [],          // Task[]
  links: [],          // Link[]
  greetingName: "",   // string
  theme: "light"      // "light" | "dark"
}
```

### Storage Module

```js
const Storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota exceeded or private browsing — silently swallow
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* swallow */ }
  },
  loadAll() {
    State.tasks       = Storage.get("tasks", []);
    State.links       = Storage.get("links", []);
    State.greetingName = Storage.get("greeting_name", "");
    State.theme       = Storage.get("theme", "light");
  }
}
```

All `Storage.get` calls return a safe fallback on any error (parse failure, quota error, SecurityError in private browsing). This satisfies Requirements 2.5, 4.9, 6.9, 7.7, and 8.5.

### ID Generation

Tasks and links require unique IDs. A simple UUID-v4-like generator is used (no library):

```js
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
```

---

## UI/UX Design Considerations

### Layout

The dashboard uses a **CSS Grid** layout. On wide viewports (≥ 768px) the four widgets are arranged in a 2×2 grid. On narrow viewports (< 768px) they stack in a single column. The theme toggle is fixed in the top-right corner.

```
┌─────────────────────┬─────────────────────┐
│   Greeting Widget   │    Focus Timer      │
├─────────────────────┼─────────────────────┤
│     Todo List       │    Quick Links      │
└─────────────────────┴─────────────────────┘
         [Theme Toggle — fixed top-right]
```

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  padding: 1.5rem;
}
@media (max-width: 767px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}
```

### Typography

- Base font: system-ui stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)
- Minimum body font size: 14px (satisfies NFR-3.1)
- Widget titles: 1.125rem / 600 weight
- Timer display: 3rem / 700 weight (monospace for stable width)
- Task text: 1rem / 400 weight; completed tasks: line-through + reduced opacity

### Colour Contrast

Both themes are designed to meet WCAG 2.1 AA (4.5:1 minimum for normal text):

| Token | Light value | Dark value | Contrast vs bg |
|---|---|---|---|
| `--text` | `#1a1a1a` | `#e0e0e0` | > 12:1 |
| `--accent` | `#4a6cf7` | `#7b9ef7` | ≥ 4.5:1 |
| `--surface` | `#f5f5f5` | `#16213e` | — (background) |

> Note: Full WCAG validation requires manual testing with assistive technologies and expert accessibility review.

### Accessibility

- All interactive controls have visible focus styles (`outline: 2px solid var(--accent)`)
- Error messages use `role="alert"` so screen readers announce them immediately
- The theme toggle has a descriptive `aria-label` that updates when the theme changes
- The timer notification uses `role="status"` for polite announcements
- Minimum touch target size for the theme toggle: 24×24px (satisfies Requirement 7.1)

### Responsive Behaviour

- Viewport range: 320px – 1920px (satisfies NFR-3.4)
- At 320px: single-column, all inputs full-width, timer display scales down
- At 1920px: grid has a `max-width: 1400px` container centred on the page

---

## Error Handling

### Strategy

The application follows a **silent-fallback** strategy for storage errors and a **inline-validation** strategy for user input errors.

| Error type | Handling |
|---|---|
| LocalStorage read failure | Return fallback value; no user-visible error |
| LocalStorage write failure | Retain in-memory state; no user-visible error |
| Corrupted JSON in LocalStorage | Discard that key's data; use empty default |
| Empty task/link input | Show inline validation message; retain input |
| Task description > 200 chars | Show inline validation message |
| Duplicate task | Show inline validation message; retain input |
| Invalid URL format | Show inline validation message |
| Link count at 20 | Show inline validation message |
| Timer already running (Start pressed) | Start button is disabled; no action possible |

### Inline Error Display

Each widget that accepts user input has a dedicated `<p role="alert">` element. Errors are shown by setting `textContent` and removing the `hidden` attribute. They auto-hide after 4 seconds or when the user successfully submits again.

```js
function showError(el, msg) {
  el.textContent = msg;
  el.removeAttribute('hidden');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.setAttribute('hidden', ''), 4000);
}
```

### Storage Quota

`localStorage` has a ~5MB limit per origin. The application stores only text data (tasks, links, name, theme), which is unlikely to approach this limit in normal use. If a write fails (e.g., `QuotaExceededError`), the `Storage.set` wrapper silently swallows the error and the in-memory state remains correct for the current session.

---

## Testing Strategy

### Dual Testing Approach

The testing strategy combines **unit/example-based tests** for specific scenarios and **property-based tests** for universal correctness guarantees.

**Unit tests** cover:
- Specific examples of correct behaviour (e.g., greeting returns "Good Morning" at 08:00)
- Edge cases (e.g., empty string, 200-char boundary, midnight hour boundary)
- Integration between widgets and the Storage module (using a mock localStorage)

**Property-based tests** cover:
- Universal properties that should hold for all valid inputs
- Input space exploration for validation logic, greeting logic, and timer formatting

### Property-Based Testing Library

**[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript) is the chosen PBT library. It integrates with any test runner (Jest, Vitest) and supports arbitrary generators for strings, numbers, arrays, and custom types.

Each property test is configured to run a minimum of **100 iterations**.

### Test File Structure

```
tests/
├── greeting.test.js    — GreetingWidget unit + property tests
├── timer.test.js       — TimerWidget unit + property tests
├── todo.test.js        — TodoWidget unit + property tests
├── links.test.js       — LinksWidget unit + property tests
├── storage.test.js     — Storage module unit tests
└── theme.test.js       — ThemeWidget unit tests
```

### Tag Format

Each property test is tagged with a comment referencing the design property it validates:

```js
// Feature: todo-dashboard, Property N: <property_text>
```

### Unit Test Focus Areas

- `GreetingWidget.getGreeting(hour)` — all four time bands, boundary hours (5, 12, 18, 22, 0, 4)
- `GreetingWidget.formatTime(date)` — zero-padding, midnight, noon
- `GreetingWidget.formatDate(date)` — day names, month names, zero-padding
- `TimerWidget.formatTime(secs)` — 1500→"25:00", 0→"00:00", 59→"00:59"
- `TodoWidget.validate()` — empty, whitespace-only, 200-char, 201-char, duplicate
- `LinksWidget.validate()` — missing protocol, empty label, label > 50, URL > 2048, count = 20
- `Storage.get()` — corrupted JSON returns fallback, missing key returns fallback


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Time format is always valid HH:MM

*For any* `Date` object, `GreetingWidget.formatTime(date)` SHALL return a string matching the pattern `HH:MM` where HH is a zero-padded integer in [00, 23] and MM is a zero-padded integer in [00, 59].

**Validates: Requirements 1.1**

---

### Property 2: Date format is always valid "Weekday, DD Month YYYY"

*For any* `Date` object, `GreetingWidget.formatDate(date)` SHALL return a string whose weekday component is one of the seven English day names, whose month component is one of the twelve English month names, and whose day and year components are valid integers.

**Validates: Requirements 1.2**

---

### Property 3: Greeting is correct for every hour of the day

*For any* integer hour in [0, 23], `GreetingWidget.getGreeting(hour)` SHALL return exactly one of {"Good Morning", "Good Afternoon", "Good Evening", "Good Night"}, and the returned value SHALL match the time band that contains that hour (05–11 → Morning, 12–17 → Afternoon, 18–21 → Evening, 22–23 and 00–04 → Night).

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 4: Greeting includes name when name is non-empty

*For any* non-empty string `name` (≤ 100 characters) and any integer hour in [0, 23], the rendered greeting message SHALL contain `name` as a suffix in the form `"<greeting>, <name>"`.

**Validates: Requirements 2.2**

---

### Property 5: Name persistence round-trip

*For any* non-empty string `name` (≤ 100 characters), calling `GreetingWidget.saveName(name)` SHALL result in `Storage.get("greeting_name")` returning a value equal to `name`.

**Validates: Requirements 2.3, 2.4**

---

### Property 6: Timer display format is always valid MM:SS

*For any* integer `seconds` in [0, 1500], `TimerWidget.formatTime(seconds)` SHALL return a string matching the pattern `MM:SS` where MM is a zero-padded integer in [00, 25] and SS is a zero-padded integer in [00, 59], and the total represented time SHALL equal `seconds`.

**Validates: Requirements 3.3**

---

### Property 7: Timer button states are mutually consistent

*For any* timer state `{ remaining, running }`, the following invariants SHALL hold simultaneously:
- If `running === true` or `remaining === 0`, the Start button SHALL be disabled.
- If `running === false` and `remaining > 0`, the Stop button SHALL be disabled.

**Validates: Requirements 3.7, 3.8**

---

### Property 8: Adding a valid task always succeeds and persists

*For any* non-empty string `description` of ≤ 200 characters that does not match any existing task (case-insensitive, trimmed), calling `TodoWidget.addTask(description)` SHALL result in: (a) the task appearing in the rendered list with `done = false`, and (b) `Storage.get("tasks")` containing an entry with the same description.

**Validates: Requirements 4.2, 4.3, 4.4**

---

### Property 9: Task completion toggle is an involution

*For any* task in the list, calling `TodoWidget.toggleTask(id)` twice SHALL return the task to its original `done` state.

**Validates: Requirements 4.5**

---

### Property 10: Deleting a task removes it from list and storage

*For any* task list containing at least one task, deleting a task by its `id` SHALL result in: (a) the task no longer appearing in the rendered list, and (b) `Storage.get("tasks")` not containing any entry with that `id`.

**Validates: Requirements 4.7**

---

### Property 11: Duplicate task detection is case- and whitespace-insensitive

*For any* existing task with description `D`, attempting to add any string that equals `D.trim().toLowerCase()` after applying `.trim().toLowerCase()` SHALL be rejected, regardless of the original casing or surrounding whitespace. This applies to both new task addition and task editing (excluding the task being edited from the comparison).

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

---

### Property 12: Adding a valid link always succeeds and persists

*For any* label of ≤ 50 characters and URL beginning with `http://` or `https://` of ≤ 2048 characters, when the total link count is < 20, calling `LinksWidget.addLink(label, url)` SHALL result in: (a) a button for the link appearing in the rendered panel, and (b) `Storage.get("links")` containing an entry with the same label and URL.

**Validates: Requirements 6.2, 6.4, 6.5**

---

### Property 13: Deleting a link removes it from panel and storage

*For any* link list containing at least one link, deleting a link by its `id` SHALL result in: (a) the link button no longer appearing in the rendered panel, and (b) `Storage.get("links")` not containing any entry with that `id`.

**Validates: Requirements 6.6**

---

### Property 14: URLs without http/https protocol are always rejected

*For any* string that does not begin with `"http://"` or `"https://"`, `LinksWidget.validate()` SHALL return `{ valid: false }` regardless of the rest of the string's content.

**Validates: Requirements 6.8**

---

### Property 15: Theme toggle is an involution

*For any* starting theme `T ∈ {"light", "dark"}`, calling `ThemeWidget.toggle()` twice SHALL result in the body element returning to its original CSS class state and `Storage.get("theme")` returning `T`.

**Validates: Requirements 7.2, 7.3, 7.5**

---

### Property 16: Corrupted LocalStorage data always yields the safe fallback

*For any* string that is not valid JSON, storing it under any of the four application keys and then calling `Storage.get(key, fallback)` SHALL return `fallback` without throwing an exception.

**Validates: Requirements 8.5**

---
