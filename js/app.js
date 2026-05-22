'use strict';

/* ============================================================
   Storage — thin wrapper around localStorage
   All errors are silently swallowed; callers receive safe fallbacks.
   ============================================================ */
const Storage = {
  /**
   * Read a value from localStorage.
   * @param {string} key
   * @param {*} fallback  Returned when the key is absent or JSON is invalid.
   * @returns {*}
   */
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Write a value to localStorage as JSON.
   * Silently swallows QuotaExceededError and SecurityError.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota exceeded or private browsing — silently swallow
    }
  },

  /**
   * Remove a key from localStorage.
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // swallow
    }
  },

  /**
   * Populate the in-memory State from all four application keys.
   * Uses safe defaults when a key is absent or its data is corrupted.
   */
  loadAll() {
    State.tasks        = Storage.get('tasks', []);
    State.links        = Storage.get('links', []);
    State.greetingName = Storage.get('greeting_name', '');
    State.theme        = Storage.get('theme', 'light');
  },
};

/* ============================================================
   generateId — UUID-v4-like helper (no external library)
   ============================================================ */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* ============================================================
   State — in-memory application state
   Mutated by widget modules; persisted to localStorage on every change.
   ============================================================ */
const State = {
  /** @type {Array<{id: string, description: string, done: boolean, createdAt: number}>} */
  tasks: [],

  /** @type {Array<{id: string, label: string, url: string}>} */
  links: [],

  /** @type {string} */
  greetingName: '',

  /** @type {'light'|'dark'} */
  theme: 'light',
};

/* ============================================================
   GreetingWidget — time/date display, name input, greeting logic
   ============================================================ */

/**
 * Format a Date as "HH:MM" (zero-padded 24-hour clock).
 * Pure function — no side effects, no DOM access.
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Format a Date as "Weekday, DD Month YYYY" (e.g. "Monday, 26 May 2025").
 * Pure function — no side effects, no DOM access.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const DAYS   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const weekday = DAYS[date.getDay()];
  const day     = String(date.getDate()).padStart(2, '0');
  const month   = MONTHS[date.getMonth()];
  const year    = date.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

/**
 * Return the appropriate greeting string for a given hour (0–23).
 * Pure function — no side effects, no DOM access.
 * 05–11 → "Good Morning"
 * 12–17 → "Good Afternoon"
 * 18–21 → "Good Evening"
 * 22–23 and 00–04 → "Good Night"
 * @param {number} hour  Integer in [0, 23]
 * @returns {string}
 */
function getGreeting(hour) {
  if (hour >= 5 && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 21) return 'Good Evening';
  return 'Good Night';
}

const GreetingWidget = {
  // Expose pure functions as properties so tests can import them via this object
  formatTime,
  formatDate,
  getGreeting,

  /**
   * Restore saved name, render immediately, start the 60-second tick,
   * and wire the modal + edit button events.
   * Shows the name modal on first visit (no saved name).
   */
  init() {
    this.render();
    setInterval(() => this.tick(), 1000);

    // Wire modal form
    const modalForm = document.getElementById('modal-name-form');
    if (modalForm) {
      modalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('modal-name-input');
        this.saveName(input ? input.value : '');
        this.closeModal();
      });
    }

    // Wire Skip button — close modal without saving
    const skipBtn = document.getElementById('modal-skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.closeModal());
    }

    // Close modal when clicking the overlay backdrop
    const overlay = document.getElementById('name-modal');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal();
      });
    }

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('name-modal');
        if (modal && !modal.hidden) this.closeModal();
      }
    });

    // Wire the ✏️ edit button in the greeting widget
    const editBtn = document.getElementById('greeting-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.openModal());
    }

    // Show modal automatically on first visit (no saved name)
    if (!State.greetingName) {
      this.openModal();
    }
  },

  /**
   * Open the name modal, pre-fill with current name if any, and focus the input.
   */
  openModal() {
    const modal = document.getElementById('name-modal');
    const input = document.getElementById('modal-name-input');
    if (modal) {
      modal.removeAttribute('hidden');
      if (input) {
        input.value = State.greetingName || '';
        // Defer focus so the browser registers the element as visible first
        setTimeout(() => input.focus(), 50);
      }
    }
  },

  /**
   * Close the name modal.
   */
  closeModal() {
    const modal = document.getElementById('name-modal');
    if (modal) modal.setAttribute('hidden', '');
  },

  /**
   * Update the time and date display every minute.
   */
  tick() {
    this.render();
  },

  /**
   * Rebuild the greeting message, time, and date display elements.
   */
  render() {
    const now = new Date();

    const timeEl    = document.getElementById('greeting-time');
    const dateEl    = document.getElementById('greeting-date');
    const messageEl = document.getElementById('greeting-message');

    if (timeEl)    timeEl.textContent = formatTime(now);
    if (dateEl)    dateEl.textContent = formatDate(now);

    if (messageEl) {
      const greeting = getGreeting(now.getHours());
      const name     = State.greetingName;
      messageEl.textContent = name ? `${greeting}, ${name}` : greeting;
    }
  },

  /**
   * Trim the name; persist or remove from Storage; re-render.
   * @param {string} name
   */
  saveName(name) {
    const trimmed = name.trim();
    if (trimmed) {
      State.greetingName = trimmed;
      Storage.set('greeting_name', trimmed);
    } else {
      State.greetingName = '';
      Storage.remove('greeting_name');
    }
    this.render();
  },
};

/* ============================================================
   TimerWidget — Pomodoro countdown timer
   Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
   ============================================================ */

/**
 * Format a total number of seconds as "MM:SS" (zero-padded).
 * Pure function — no side effects, no DOM access.
 * @param {number} secs  Integer in [0, 1500]
 * @returns {string}
 */
function formatTimerTime(secs) {
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const TimerWidget = {
  // Expose pure function for testing
  formatTime: formatTimerTime,

  /** @type {{ remaining: number, intervalId: number|null, running: boolean, startedAt: number|null }} */
  timerState: {
    remaining: 1500,
    intervalId: null,
    running: false,
    startedAt: null,   // Date.now() snapshot for the last persisted remaining value
  },

  /**
   * Persist the current timer state to localStorage so it survives refresh.
   * Saves: remaining, running, startedAt.
   */
  _persist() {
    Storage.set('timer_state', {
      remaining: this.timerState.remaining,
      running:   this.timerState.running,
      startedAt: this.timerState.startedAt,
    });
  },

  /**
   * Restore timer state from localStorage.
   * If the timer was running when the page was closed/refreshed, calculate
   * how many seconds have elapsed since startedAt and subtract from remaining.
   */
  _restore() {
    const saved = Storage.get('timer_state', null);
    if (!saved) return; // no saved state — use default 25:00

    let { remaining, running, startedAt } = saved;

    if (running && startedAt) {
      // Calculate elapsed seconds since the timer snapshot was last saved
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      remaining = Math.max(0, remaining - elapsed);
    }

    this.timerState.remaining = remaining;
    this.timerState.running   = false;   // interval must be re-created after restore
    this.timerState.startedAt = null;

    // If there was still time left and the timer was running, resume it
    if (running && remaining > 0) {
      this.timerState.startedAt = Date.now();
      this.timerState.running   = true;
      this._persist();
      this.timerState.intervalId = setInterval(() => this.countdown(), 1000);
    }

    // If time ran out while the page was closed, show the notification
    if (remaining === 0) {
      const notification = document.getElementById('timer-notification');
      if (notification) notification.removeAttribute('hidden');
    }
  },

  /**
   * Restore persisted state, render, and wire button click events.
   */
  init() {
    this._restore();
    this.render();

    const btnStart = document.getElementById('timer-start');
    const btnStop  = document.getElementById('timer-stop');
    const btnReset = document.getElementById('timer-reset');

    if (btnStart) btnStart.addEventListener('click', () => this.start());
    if (btnStop)  btnStop.addEventListener('click',  () => this.stop());
    if (btnReset) btnReset.addEventListener('click', () => this.reset());
  },

  /**
   * Begin counting down in one-second intervals from the current remaining time.
   * Requirement 3.2
   */
  start() {
    if (this.timerState.running || this.timerState.remaining === 0) return;

    this.timerState.running    = true;
    this.timerState.startedAt  = Date.now();
    this.timerState.intervalId = setInterval(() => this.countdown(), 1000);
    this._persist();
    this.render();
  },

  /**
   * Pause the countdown and retain the current remaining time.
   * Requirement 3.4
   */
  stop() {
    if (!this.timerState.running) return;

    clearInterval(this.timerState.intervalId);
    this.timerState.intervalId = null;
    this.timerState.running    = false;
    this.timerState.startedAt  = null;
    this._persist();
    this.render();
  },

  /**
   * Stop any active countdown and reset the display to 25:00.
   * Hide the notification.
   * Requirement 3.5
   */
  reset() {
    clearInterval(this.timerState.intervalId);
    this.timerState.intervalId = null;
    this.timerState.running    = false;
    this.timerState.remaining  = 1500;
    this.timerState.startedAt  = null;

    Storage.remove('timer_state');

    const notification = document.getElementById('timer-notification');
    if (notification) notification.setAttribute('hidden', '');

    this.render();
  },

  /**
   * Decrement remaining seconds by one; stop and notify when reaching 00:00.
   * Requirement 3.3, 3.6
   */
  countdown() {
    this.timerState.remaining -= 1;

    if (this.timerState.remaining <= 0) {
      this.timerState.remaining  = 0;
      clearInterval(this.timerState.intervalId);
      this.timerState.intervalId = null;
      this.timerState.running    = false;
      this.timerState.startedAt  = null;

      Storage.remove('timer_state');

      const notification = document.getElementById('timer-notification');
      if (notification) notification.removeAttribute('hidden');
    } else {
      this.timerState.startedAt = Date.now();
      this._persist();
    }

    this.render();
  },

  /**
   * Update the timer display and enforce the button state matrix.
   *
   * Button State Matrix (Requirements 3.7, 3.8):
   * ┌──────────────────┬───────┬──────┬───────┐
   * │ Timer state      │ Start │ Stop │ Reset │
   * ├──────────────────┼───────┼──────┼───────┤
   * │ Idle (25:00)     │  on   │  off │  on   │
   * │ Running          │  off  │  on  │  on   │
   * │ Paused           │  on   │  off │  on   │
   * │ Finished (00:00) │  off  │  off │  on   │
   * └──────────────────┴───────┴──────┴───────┘
   */
  render() {
    const { remaining, running } = this.timerState;

    const display = document.getElementById('timer-display');
    if (display) display.textContent = formatTimerTime(remaining);

    const btnStart = document.getElementById('timer-start');
    const btnStop  = document.getElementById('timer-stop');

    if (btnStart) btnStart.disabled = running || remaining === 0;
    if (btnStop)  btnStop.disabled  = !running;
  },
};

/* ============================================================
   TodoWidget — task CRUD, duplicate detection, persistence
   Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 4.9, 4.10,
                 4.11, 4.12, 5.1, 5.2
   ============================================================ */
const TodoWidget = {
  /** @type {number|null} Auto-hide timer handle for the error message */
  _errorTimer: null,

  /**
   * Restore tasks from State (already loaded by Storage.loadAll), render,
   * and wire the #todo-form submit event.
   * Requirement 4.4
   */
  init() {
    this.render();

    const form = document.getElementById('todo-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('todo-input');
        const description = input ? input.value : '';
        const result = this.validate(description);
        if (!result.valid) {
          this.showError(result.error);
          return;
        }
        this.addTask(description);
        if (input) input.value = '';
      });
    }
  },

  /**
   * Validate a task description.
   * Rules:
   *   - Must not be empty / whitespace-only (Requirement 4.8)
   *   - Must be ≤ 200 characters (Requirement 4.9)
   *   - Must not duplicate an existing task, case- and whitespace-insensitive
   *     (Requirements 5.1, 5.2); excludeId exempts the task being edited
   *
   * @param {string} description
   * @param {string} [excludeId]
   * @returns {{ valid: boolean, error: string }}
   */
  validate(description, excludeId) {
    const trimmed = description.trim();
    if (!trimmed) {
      return { valid: false, error: 'Task description cannot be empty.' };
    }
    if (trimmed.length > 200) {
      return { valid: false, error: 'Task description must be 200 characters or fewer.' };
    }
    if (this.isDuplicate(trimmed, excludeId)) {
      return { valid: false, error: 'This task already exists.' };
    }
    return { valid: true, error: '' };
  },

  /**
   * Check whether a (trimmed) description matches any existing task,
   * case-insensitively, optionally excluding the task with excludeId.
   * Requirements 5.1, 5.2
   *
   * @param {string} description  Already-trimmed description to check.
   * @param {string} [excludeId]  ID of the task to exclude from comparison.
   * @returns {boolean}
   */
  isDuplicate(description, excludeId) {
    const normalised = description.trim().toLowerCase();
    return State.tasks.some(
      (task) => task.id !== excludeId && task.description.trim().toLowerCase() === normalised,
    );
  },

  /**
   * Create a new task, push it to State, persist, and re-render.
   * Requirement 4.2, 4.3
   *
   * @param {string} description
   */
  addTask(description) {
    const task = {
      id: generateId(),
      description: description.trim(),
      done: false,
      createdAt: Date.now(),
    };
    State.tasks.push(task);
    Storage.set('tasks', State.tasks);
    this.render();
  },

  /**
   * Remove the task with the given id from State, persist, and re-render.
   * Requirement 4.7
   *
   * @param {string} id
   */
  deleteTask(id) {
    State.tasks = State.tasks.filter((task) => task.id !== id);
    Storage.set('tasks', State.tasks);
    this.render();
  },

  /**
   * Flip the done flag of the task with the given id, persist, and re-render.
   * Requirement 4.5
   *
   * @param {string} id
   */
  toggleTask(id) {
    const task = State.tasks.find((t) => t.id === id);
    if (task) {
      task.done = !task.done;
      Storage.set('tasks', State.tasks);
      this.render();
    }
  },

  /**
   * Replace the task <li> with an inline edit form pre-filled with the
   * current description.
   * Requirements: 4.6
   *
   * @param {string} id
   */
  beginEdit(id) {
    const task = State.tasks.find((t) => t.id === id);
    if (!task) return;

    const list = document.getElementById('todo-list');
    if (!list) return;

    const li = list.querySelector(`li[data-id="${id}"]`);
    if (!li) return;

    // Build the inline edit form
    const form = document.createElement('form');
    form.className = 'todo-edit-form';
    form.noValidate = true;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 200;
    input.value = task.description;
    input.className = 'todo-edit-input';
    input.setAttribute('aria-label', 'Edit task description');

    const btnSave = document.createElement('button');
    btnSave.type = 'submit';
    btnSave.textContent = 'Save';
    btnSave.className = 'btn-save';

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.textContent = 'Cancel';
    btnCancel.className = 'btn-cancel';

    form.appendChild(input);
    form.appendChild(btnSave);
    form.appendChild(btnCancel);

    // Wire Save (form submit)
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEdit(id, input.value);
    });

    // Wire Cancel
    btnCancel.addEventListener('click', () => {
      this.cancelEdit(id);
    });

    // Replace the <li> with the edit form (wrapped in a <li> to keep valid HTML)
    const editLi = document.createElement('li');
    editLi.dataset.id = id;
    editLi.className = 'todo-edit-row';
    editLi.appendChild(form);

    li.replaceWith(editLi);

    // Focus the input for immediate editing
    input.focus();
    input.select();
  },

  /**
   * Validate the edited description (excluding self from duplicate check),
   * update State, persist, and re-render.
   * Requirements: 4.6, 5.3, 5.4
   *
   * @param {string} id
   * @param {string} description
   */
  saveEdit(id, description) {
    const result = this.validate(description, id);
    if (!result.valid) {
      this.showError(result.error);
      return;
    }

    const task = State.tasks.find((t) => t.id === id);
    if (task) {
      task.description = description.trim();
      Storage.set('tasks', State.tasks);
    }
    this.render();
  },

  /**
   * Discard any edits and restore the original <li> by re-rendering.
   * Requirements: 4.6
   *
   * @param {string} id
   */
  cancelEdit(id) {
    this.render();
  },

  /**
   * Rebuild the #todo-list from State.tasks.
   * - Completed tasks get a strikethrough + reduced-opacity style (Requirement 4.5).
   * - Shows an empty-list placeholder when there are no tasks (Requirement 4.12).
   */
  render() {
    const list = document.getElementById('todo-list');
    if (!list) return;

    list.innerHTML = '';

    if (State.tasks.length === 0) {
      const placeholder = document.createElement('li');
      placeholder.className = 'empty-placeholder todo-empty';
      placeholder.textContent = 'No tasks yet. Add one above!';
      list.appendChild(placeholder);
      return;
    }

    State.tasks.forEach((task) => {
      const li = document.createElement('li');
      li.dataset.id = task.id;

      // Checkbox for toggling done state
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.setAttribute('aria-label', `Mark "${task.description}" as ${task.done ? 'incomplete' : 'complete'}`);
      checkbox.addEventListener('change', () => this.toggleTask(task.id));

      // Description span with strikethrough when done
      const span = document.createElement('span');
      span.className = 'task-text' + (task.done ? ' done' : '');
      span.textContent = task.description;

      // Edit button
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-edit';
      btnEdit.textContent = 'Edit';
      btnEdit.setAttribute('aria-label', `Edit task "${task.description}"`);
      btnEdit.addEventListener('click', () => this.beginEdit(task.id));

      // Delete button
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-danger';
      btnDelete.textContent = 'Delete';
      btnDelete.setAttribute('aria-label', `Delete task "${task.description}"`);
      btnDelete.addEventListener('click', () => this.deleteTask(task.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(btnEdit);
      li.appendChild(btnDelete);
      list.appendChild(li);
    });
  },

  /**
   * Display an inline error message in #todo-error and auto-hide it after 4 s.
   * Requirement 4.8, 4.9, 5.2
   *
   * @param {string} msg
   */
  showError(msg) {
    const errorEl = document.getElementById('todo-error');
    if (!errorEl) return;

    errorEl.textContent = msg;
    errorEl.removeAttribute('hidden');

    clearTimeout(this._errorTimer);
    this._errorTimer = setTimeout(() => {
      errorEl.setAttribute('hidden', '');
    }, 4000);
  },
};

/* ============================================================
   LinksWidget — quick link CRUD, URL validation, persistence
   Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9
   ============================================================ */
const LinksWidget = {
  /** @type {number|null} Auto-hide timer handle for the error message */
  _errorTimer: null,

  /**
   * Validate a label and URL before adding a link.
   * Rules:
   *   - Label must not be empty / whitespace-only (Requirement 6.7)
   *   - Label must be ≤ 50 characters (Requirement 6.7)
   *   - URL must not be empty / whitespace-only (Requirement 6.7)
   *   - URL must be ≤ 2048 characters (Requirement 6.7)
   *   - URL must begin with "http://" or "https://" (Requirement 6.8)
   *   - URL must not duplicate an existing saved URL (Requirement 6.7)
   *   - Total link count must be < 20 before adding (Requirement 6.7)
   *
   * @param {string} label
   * @param {string} url
   * @returns {{ valid: boolean, error: string }}
   */
  validate(label, url) {
    const trimmedLabel = label.trim();
    const trimmedUrl   = url.trim();

    if (!trimmedLabel) {
      return { valid: false, error: 'Link label cannot be empty.' };
    }
    if (trimmedLabel.length > 50) {
      return { valid: false, error: 'Link label must be 50 characters or fewer.' };
    }
    if (!trimmedUrl) {
      return { valid: false, error: 'URL cannot be empty.' };
    }
    if (trimmedUrl.length > 2048) {
      return { valid: false, error: 'URL must be 2048 characters or fewer.' };
    }
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return { valid: false, error: 'URL must begin with http:// or https://.' };
    }
    if (State.links.some((link) => link.url === trimmedUrl)) {
      return { valid: false, error: 'This URL has already been saved.' };
    }
    if (State.links.length >= 20) {
      return { valid: false, error: 'You can save a maximum of 20 links.' };
    }
    return { valid: true, error: '' };
  },

  /**
   * Create a new link, push it to State, persist, and re-render.
   * Requirements 6.2, 6.4
   *
   * @param {string} label
   * @param {string} url
   */
  addLink(label, url) {
    const link = {
      id:    generateId(),
      label: label.trim(),
      url:   url.trim(),
    };
    State.links.push(link);
    Storage.set('links', State.links);
    this.render();
  },

  /**
   * Remove the link with the given id from State, persist, and re-render.
   * Requirement 6.6
   *
   * @param {string} id
   */
  deleteLink(id) {
    State.links = State.links.filter((link) => link.id !== id);
    Storage.set('links', State.links);
    this.render();
  },

  /**
   * Rebuild the #links-list from State.links.
   * - Each link is rendered as an <a> inside a .link-entry div with a delete button.
   * - Shows an empty-links placeholder when no links exist (Requirement 6.5).
   * Requirements 6.2, 6.3, 6.5
   */
  render() {
    const list = document.getElementById('links-list');
    if (!list) return;

    list.innerHTML = '';

    if (State.links.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.className = 'empty-placeholder links-empty';
      placeholder.textContent = 'No links yet. Add one above!';
      list.appendChild(placeholder);
      return;
    }

    State.links.forEach((link) => {
      const entry = document.createElement('div');
      entry.className = 'link-entry';
      entry.dataset.id = link.id;

      // Anchor — opens in new tab with security attributes (Requirement 6.3)
      const anchor = document.createElement('a');
      anchor.href   = link.url;
      anchor.target = '_blank';
      anchor.rel    = 'noopener noreferrer';
      anchor.textContent = link.label;

      // Delete button
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-delete-link';
      btnDelete.textContent = '×';
      btnDelete.setAttribute('aria-label', `Delete link "${link.label}"`);
      btnDelete.addEventListener('click', () => this.deleteLink(link.id));

      entry.appendChild(anchor);
      entry.appendChild(btnDelete);
      list.appendChild(entry);
    });
  },

  /**
   * Display an inline error message in #links-error and auto-hide it after 4 s.
   * Requirements 6.7, 6.8
   *
   * @param {string} msg
   */
  showError(msg) {
    const errorEl = document.getElementById('links-error');
    if (!errorEl) return;

    errorEl.textContent = msg;
    errorEl.removeAttribute('hidden');

    clearTimeout(this._errorTimer);
    this._errorTimer = setTimeout(() => {
      errorEl.setAttribute('hidden', '');
    }, 4000);
  },

  /**
   * Restore links from State (already loaded by Storage.loadAll), render,
   * and wire the #links-form submit event.
   * Requirements 6.5, 6.9
   */
  init() {
    this.render();

    const form = document.getElementById('links-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const labelInput = document.getElementById('link-label-input');
        const urlInput   = document.getElementById('link-url-input');
        const label = labelInput ? labelInput.value : '';
        const url   = urlInput   ? urlInput.value   : '';

        const result = this.validate(label, url);
        if (!result.valid) {
          this.showError(result.error);
          return;
        }

        this.addLink(label, url);
        if (labelInput) labelInput.value = '';
        if (urlInput)   urlInput.value   = '';
      });
    }
  },
};

/* ============================================================
   ThemeWidget — light/dark mode toggle, persistence, and init
   Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
   ============================================================ */
const ThemeWidget = {
  /**
   * Apply a theme by adding or removing the 'dark' class on <body>.
   * Also updates the aria-label on #theme-toggle to reflect the active theme.
   * Requirements 7.2, 7.1
   *
   * @param {'light'|'dark'} theme
   */
  apply(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }

    // Update icon and aria-label to reflect the currently active theme.
    // Light mode → show 🌙 (click to go dark)
    // Dark mode  → show ☀️ (click to go light)
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      );
    }
  },

  /**
   * Persist the selected theme value to LocalStorage under the key "theme".
   * Silently swallows any write failure (Storage.set handles this).
   * Requirements 7.3, 7.4
   *
   * @param {'light'|'dark'} theme
   */
  persist(theme) {
    Storage.set('theme', theme);
    State.theme = theme;
  },

  /**
   * Flip the current theme between 'light' and 'dark', apply it, and persist.
   * Requirement 7.2, 7.3
   */
  toggle() {
    const next = State.theme === 'dark' ? 'light' : 'dark';
    this.apply(next);
    this.persist(next);
  },

  /**
   * Load the saved theme from State (already populated by Storage.loadAll),
   * apply it, and wire the #theme-toggle click event.
   * Defaults to 'light' if no saved theme or on read failure (Requirements 7.6, 7.7).
   * Must be called before other widgets render to prevent flash of wrong theme.
   * Requirement 7.5
   */
  init() {
    // State.theme was populated by Storage.loadAll(); default to 'light' if invalid
    const saved = State.theme;
    const theme = (saved === 'light' || saved === 'dark') ? saved : 'light';

    // Sync State in case the stored value was invalid
    State.theme = theme;

    // Apply the theme immediately (before other widgets render)
    this.apply(theme);

    // Wire the toggle button
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => this.toggle());
    }
  },
};

/* ============================================================
   App — bootstrap
   Initialisation sequence follows the design spec:
     1. Storage.loadAll()
     2. ThemeWidget.init()
     3. GreetingWidget.init()
     4. TimerWidget.init()
     5. TodoWidget.init()
     6. LinksWidget.init()
   ============================================================ */
const App = {
  init() {
    Storage.loadAll();
    ThemeWidget.init();
    GreetingWidget.init();
    TimerWidget.init();
    TodoWidget.init();
    LinksWidget.init();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
