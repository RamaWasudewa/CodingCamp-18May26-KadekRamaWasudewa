# Implementation Plan: Todo Dashboard

## Overview

Build a single-page personal productivity dashboard using plain HTML, CSS, and Vanilla JavaScript. The implementation follows the widget-based, event-driven architecture defined in the design: one `index.html`, one `css/style.css`, and one `js/app.js`. All state is held in memory and synced to `localStorage` on every mutation. The plan proceeds from project scaffolding through each widget, then wires everything together.

Pure functions (`formatTime`, `formatDate`, `getGreeting`, `formatTimerTime`, `getTimerButtonStates`, `validateTask`, `isDuplicateTask`) and the `Storage` factory (`createStorage`) are exported from `js/utils.js` so they can be imported by both `app.js` and the test suite without browser globals.

---

## Tasks

- [x] 1. Scaffold project structure and shared utilities
  - Create `index.html` with the dashboard grid layout, all five widget `<section>` elements, and the theme toggle button
  - Create `css/style.css` with CSS custom properties for both themes, the 2-column grid layout, responsive breakpoint at 767px, typography scale, focus styles, and base widget card styles
  - Create `js/utils.js` exporting `generateId`, `createStorage`, `DEFAULT_STATE`, and all widget pure functions
  - Create `js/app.js` with the `Storage` module (using `createStorage(localStorage)`), the in-memory `State` object, and the `App.init()` bootstrap stub
  - Set up the `tests/` directory and install `vitest` + `fast-check` as dev dependencies
  - _Requirements: NFR-1.2, NFR-1.3, 8.3_

- [x] 2. Implement Greeting Widget
  - [x] 2.1 Implement `GreetingWidget` module in `app.js`
    - Export `formatTime(date)`, `formatDate(date)`, and `getGreeting(hour)` pure functions from `js/utils.js`
    - Write `init()`, `tick()`, `render()`, and `saveName(name)` methods in `app.js`
    - Wire the greeting form submit event; handle empty-name clear (remove key from Storage per Requirement 2.7)
    - Start the 60-second `setInterval` tick on init; render immediately on load
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 2.2 Write property tests for `GreetingWidget` pure functions in `tests/greeting.test.js`
    - Import `formatTime`, `formatDate`, `getGreeting` from `../js/utils.js`
    - **Property 1: Time format is always valid HH:MM** — `fc.date()` → assert regex `/^([01]\d|2[0-3]):[0-5]\d$/`
    - **Validates: Requirements 1.1**
    - **Property 2: Date format is always valid "Weekday, DD Month YYYY"** — `fc.date()` → assert weekday, month, day, year components
    - **Validates: Requirements 1.2**
    - **Property 3: Greeting is correct for every hour** — `fc.integer({min:0,max:23})` → assert correct time band
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
    - **Property 4: Greeting includes name when name is non-empty** — `fc.string({minLength:1,maxLength:100})` × `fc.integer({min:0,max:23})` → assert `"<greeting>, <name>"` format
    - **Validates: Requirements 2.2**

  - [ ]* 2.3 Write unit tests for `GreetingWidget` in `tests/greeting.test.js`
    - Import `formatTime`, `formatDate`, `getGreeting` from `../js/utils.js`
    - Test `getGreeting` at all four boundary hours (5, 12, 18, 22) and edge hours (0, 4, 11, 17, 21, 23)
    - Test `formatTime` for zero-padding, midnight (00:00), noon (12:00)
    - Test `formatDate` for correct day names, month names, and zero-padded day
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3. Implement Focus Timer Widget
  - [x] 3.1 Implement `TimerWidget` module in `app.js`
    - Export `formatTimerTime(secs)` and `getTimerButtonStates({remaining, running})` pure functions from `js/utils.js`
    - Write `init()`, `start()`, `stop()`, `reset()`, `countdown()`, and `render()` methods in `app.js`
    - Manage `timerState` (`remaining`, `intervalId`, `running`) and enforce the button state matrix on every state change
    - Show/hide the `#timer-notification` element when countdown reaches 00:00; hide on reset
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 3.2 Write property tests for `TimerWidget` in `tests/timer.test.js`
    - Import `formatTimerTime`, `getTimerButtonStates` from `../js/utils.js`
    - **Property 6: Timer display format is always valid MM:SS** — `fc.integer({min:0,max:1500})` → assert regex `/^\d{2}:\d{2}$/` and that `MM*60 + SS === secs`
    - **Validates: Requirements 3.3**
    - **Property 7: Timer button states are mutually consistent** — `fc.record({remaining: fc.integer({min:0,max:1500}), running: fc.boolean()})` → assert Start/Stop disable invariants
    - **Validates: Requirements 3.7, 3.8**

  - [ ]* 3.3 Write unit tests for `TimerWidget` in `tests/timer.test.js`
    - Import `formatTimerTime`, `getTimerButtonStates` from `../js/utils.js`
    - Test `formatTimerTime`: 1500→"25:00", 0→"00:00", 59→"00:59", 61→"01:01"
    - Test `getTimerButtonStates` for all four timer states (idle, running, paused, finished)
    - _Requirements: 3.3, 3.7, 3.8_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm all greeting and timer tests pass; ask the user if questions arise.

- [x] 5. Implement Todo Widget
  - [x] 5.1 Implement `TodoWidget` core CRUD in `app.js`
    - Export `validateTask(description, tasks, excludeId?)` and `isDuplicateTask(description, tasks, excludeId?)` from `js/utils.js`
    - Write `addTask(description)`, `deleteTask(id)`, `toggleTask(id)`, and `render()` methods in `app.js`
    - Wire the `#todo-form` submit event; show inline errors via `showError(msg)` with 4-second auto-hide
    - Persist to Storage after every mutation; restore tasks from `State.tasks` on `init()`
    - Render strikethrough style for completed tasks; show empty-list placeholder when no tasks exist
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 5.1, 5.2_

  - [x] 5.2 Implement `TodoWidget` inline editing in `app.js`
    - Write `beginEdit(id)`, `saveEdit(id, description)`, and `cancelEdit(id)` methods
    - Add an Edit button to each task `<li>` in `render()`; replace the `<li>` with an inline edit form on `beginEdit`
    - Reuse `validateTask` with `excludeId` for duplicate detection during edit; restore original `<li>` on cancel
    - _Requirements: 4.6, 5.3, 5.4_

  - [ ]* 5.3 Write property tests for `TodoWidget` in `tests/todo.test.js`
    - Import `validateTask`, `isDuplicateTask` from `../js/utils.js`
    - **Property 8: Adding a valid task always succeeds and persists** — `fc.string({minLength:1,maxLength:200})` (filtered to non-duplicate) → assert task in rendered list with `done=false` and in Storage
    - **Validates: Requirements 4.2, 4.3, 4.4**
    - **Property 9: Task completion toggle is an involution** — for any task, `toggleTask(id)` twice → assert original `done` state restored
    - **Validates: Requirements 4.5**
    - **Property 10: Deleting a task removes it from list and storage** — for any non-empty task list, `deleteTask(id)` → assert task absent from rendered list and Storage
    - **Validates: Requirements 4.7**
    - **Property 11: Duplicate detection is case- and whitespace-insensitive** — `fc.string({minLength:1,maxLength:200})` with casing/whitespace variants → assert `validateTask` rejects duplicates and allows non-duplicates
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [ ]* 5.4 Write unit tests for `TodoWidget` in `tests/todo.test.js`
    - Import `validateTask`, `isDuplicateTask` from `../js/utils.js`
    - Test `validateTask`: empty string, whitespace-only, exactly 200 chars (valid), 201 chars (invalid)
    - Test `isDuplicateTask`: exact match, case-insensitive match, whitespace-padded match, no match
    - Test `validateTask` with `excludeId`: editing a task to its own text should succeed
    - _Requirements: 4.8, 4.9, 5.1, 5.2, 5.3, 5.4_

- [x] 6. Implement Quick Links Widget
  - [x] 6.1 Implement `LinksWidget` module in `app.js`
    - Write `validate(label, url)` helper covering all rejection conditions (empty label, label > 50, empty URL, URL > 2048, missing http/https protocol, duplicate URL, count ≥ 20)
    - Write `addLink(label, url)`, `deleteLink(id)`, and `render()` methods
    - Wire the `#links-form` submit event; show inline errors via `showError(msg)` with 4-second auto-hide
    - Render each link as `<a target="_blank" rel="noopener noreferrer">` inside a `.link-entry` div with a delete button
    - Show an empty-links placeholder when no links exist
    - Persist to Storage after every mutation; restore links from `State.links` on `init()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ]* 6.2 Write property tests for `LinksWidget` in `tests/links.test.js`
    - **Property 12: Adding a valid link always succeeds and persists** — `fc.string({minLength:1,maxLength:50})` × valid URL → assert link button in rendered panel and in Storage
    - **Validates: Requirements 6.2, 6.4, 6.5**
    - **Property 13: Deleting a link removes it from panel and storage** — for any non-empty link list, `deleteLink(id)` → assert link absent from rendered panel and Storage
    - **Validates: Requirements 6.6**
    - **Property 14: URLs without http/https are always rejected** — `fc.string()` filtered to not start with `http://` or `https://` → assert `validate` returns `{ valid: false }`
    - **Validates: Requirements 6.8**

  - [ ]* 6.3 Write unit tests for `LinksWidget` in `tests/links.test.js`
    - Test `validate`: empty label, label exactly 50 chars (valid), 51 chars (invalid), empty URL, URL with `ftp://` prefix (invalid), URL with `http://` prefix (valid), count = 20 (invalid), count = 19 (valid)
    - Test duplicate URL rejection
    - _Requirements: 6.7, 6.8_

- [x] 7. Implement Theme Widget
  - [x] 7.1 Implement `ThemeWidget` module in `app.js`
    - Write `apply(theme)` (add/remove `dark` class on `<body>`), `persist(theme)`, `toggle()`, and `init()` methods
    - Update `aria-label` on `#theme-toggle` to reflect the currently active theme on every toggle (e.g. "Switch to dark mode" / "Switch to light mode")
    - Apply saved theme on `init()` before other widgets render (per initialisation sequence in `App.init()`)
    - Default to `"light"` if no saved theme or on read failure
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 7.2 Write property tests for `ThemeWidget` in `tests/theme.test.js`
    - **Property 15: Theme toggle is an involution** — for any starting theme `T ∈ {"light","dark"}`, `toggle()` twice → assert body class and `Storage.get("theme")` return to `T`
    - **Validates: Requirements 7.2, 7.3, 7.5**

  - [ ]* 7.3 Write unit tests for `ThemeWidget` in `tests/theme.test.js`
    - Test `apply("dark")` adds `dark` class on `<body>`; `apply("light")` removes it
    - Test `init()` with no saved theme defaults to light
    - Test `init()` with corrupted storage value defaults to light
    - _Requirements: 7.5, 7.6, 7.7_

- [x] 8. Implement Storage module and data persistence
  - [x] 8.1 Implement `Storage` module with error resilience in `js/utils.js`
    - Export `createStorage(store)` factory with `get(key, fallback)`, `set(key, value)`, and `remove(key)` methods
    - `get` uses try/catch returning fallback on any error (parse failure, SecurityError)
    - `set` uses try/catch silently swallowing `QuotaExceededError`
    - Export `DEFAULT_STATE` with correct empty defaults for all four keys
    - In `app.js`, call `Storage.loadAll()` to populate `State` from all four keys with correct fallbacks
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x]* 8.2 Write property tests for `Storage` in `tests/utils.test.js`
    - **Property 16: Corrupted LocalStorage data always yields the safe fallback** — `fc.string()` filtered to invalid JSON → store under each key → assert `Storage.get(key, fallback)` returns `fallback` without throwing
    - **Validates: Requirements 8.5**

  - [x]* 8.3 Write unit tests for `Storage` in `tests/utils.test.js`
    - Test `get` with missing key returns fallback
    - Test `get` with corrupted JSON returns fallback
    - Test `set` with mock `localStorage` that throws `QuotaExceededError` does not propagate
    - Test `loadAll` initialises all four `State` fields with correct defaults when storage is empty
    - _Requirements: 8.1, 8.4, 8.5_

- [x] 9. Checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm all widget and storage tests pass; ask the user if questions arise.

- [x] 10. Wire all widgets together and finalise `App.init()`
  - [x] 10.1 Complete `App.init()` bootstrap sequence in `app.js`
    - Ensure `Storage.loadAll()` is called first, then `ThemeWidget.init()`, then `GreetingWidget.init()`, `TimerWidget.init()`, `TodoWidget.init()`, `LinksWidget.init()` in order on `DOMContentLoaded`
    - Verify theme is applied before any widget renders to prevent flash of wrong theme
    - _Requirements: 8.1, 7.5, 1.1_

  - [x] 10.2 Apply responsive layout and visual polish in `css/style.css`
    - Verify `.dashboard-grid` uses `grid-template-columns: repeat(2, 1fr)` and `gap: 1.5rem`
    - Verify `@media (max-width: 767px)` breakpoint for single-column layout is present
    - Verify `max-width: 1400px` container centred on the page for wide viewports
    - Verify system-ui font stack, minimum 14px body font, 3rem monospace timer display, strikethrough + reduced opacity for completed tasks
    - Verify all interactive controls have `outline: 2px solid var(--accent)` focus styles
    - _Requirements: NFR-3.1, NFR-3.2, NFR-3.3, NFR-3.4_

  - [ ]* 10.3 Write integration tests for full widget lifecycle in `tests/integration.test.js`
    - Test full add → toggle → edit → delete cycle for tasks using a mock DOM and mock localStorage
    - Test full add → delete cycle for links
    - Test theme toggle persists and is restored on simulated reload
    - _Requirements: 4.2, 4.5, 4.6, 4.7, 6.2, 6.6, 7.3, 7.5_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm the full test suite passes with zero failures; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 4, 9, 11) ensure incremental validation at natural breaks
- Property tests validate universal correctness properties using `fast-check` with ≥ 100 iterations each
- Unit tests validate specific examples and edge cases
- Pure functions and the `Storage` factory live in `js/utils.js` and are imported by both `app.js` and the test suite; this avoids browser-global issues in the Node/Vitest environment
- Tasks 8.1, 8.2, and 8.3 are complete — `createStorage`, `DEFAULT_STATE`, and all Storage tests (including Property 16) are implemented in `js/utils.js` and `tests/utils.test.js`
- All link anchors must use `target="_blank" rel="noopener noreferrer"` for security (Requirement 6.3)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.2", "2.3", "3.2", "3.3", "5.3", "5.4", "6.2", "6.3", "7.2", "7.3"] },
    { "id": 1, "tasks": ["10.3"] }
  ]
}
```
