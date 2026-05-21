/**
 * utils.js — shared pure utilities and the Storage module.
 *
 * This file is imported by both app.js (browser) and the test suite (Node/Vitest).
 * It must NOT reference browser-only globals (window, document, etc.) at module
 * evaluation time so that Vitest can import it in a Node environment.
 */

'use strict';

/* ============================================================
   generateId — UUID-v4-like helper (no external library)
   ============================================================ */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* ============================================================
   Storage — thin wrapper around localStorage
   Accepts an optional `store` parameter so tests can inject a
   mock storage object instead of the real localStorage.
   ============================================================ */

/**
 * Create a Storage module bound to a given storage backend.
 * In production, pass `window.localStorage`.
 * In tests, pass a mock object.
 *
 * @param {Storage} store  Any object with getItem/setItem/removeItem.
 */
export function createStorage(store) {
  return {
    /**
     * Read a value from the store.
     * @param {string} key
     * @param {*} fallback  Returned when the key is absent or JSON is invalid.
     * @returns {*}
     */
    get(key, fallback) {
      try {
        const raw = store.getItem(key);
        return raw !== null ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },

    /**
     * Write a value to the store as JSON.
     * Silently swallows QuotaExceededError and SecurityError.
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
      try {
        store.setItem(key, JSON.stringify(value));
      } catch {
        // quota exceeded or private browsing — silently swallow
      }
    },

    /**
     * Remove a key from the store.
     * @param {string} key
     */
    remove(key) {
      try {
        store.removeItem(key);
      } catch {
        // swallow
      }
    },
  };
}

/* ============================================================
   In-memory State shape (exported for documentation / typing)
   The actual mutable State object lives in app.js.
   ============================================================ */
export const DEFAULT_STATE = {
  tasks: [],
  links: [],
  greetingName: '',
  theme: 'light',
};

/* ============================================================
   GreetingWidget pure functions
   These are exported so they can be unit/property tested in isolation.
   ============================================================ */

const DAYS   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Format a Date as "HH:MM" (zero-padded 24-hour clock).
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Format a Date as "Weekday, DD Month YYYY" (e.g. "Monday, 26 May 2025").
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const weekday = DAYS[date.getDay()];
  const day     = String(date.getDate()).padStart(2, '0');
  const month   = MONTHS[date.getMonth()];
  const year    = date.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

/**
 * Return the appropriate greeting string for a given hour (0–23).
 * 05–11 → "Good Morning"
 * 12–17 → "Good Afternoon"
 * 18–21 → "Good Evening"
 * 22–23 and 00–04 → "Good Night"
 * @param {number} hour  Integer in [0, 23]
 * @returns {string}
 */
export function getGreeting(hour) {
  if (hour >= 5 && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 21) return 'Good Evening';
  return 'Good Night';
}

/* ============================================================
   TimerWidget pure functions
   Exported so they can be unit/property tested in isolation.
   ============================================================ */

/**
 * Format a total number of seconds as "MM:SS" (zero-padded).
 * Pure function — no side effects, no DOM access.
 * @param {number} secs  Integer in [0, 1500]
 * @returns {string}
 */
export function formatTimerTime(secs) {
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Derive the button enabled/disabled state from a timer state snapshot.
 * Pure function — no DOM access.
 *
 * Button State Matrix (Requirements 3.7, 3.8):
 *   running=true  OR remaining=0  → Start disabled
 *   running=false AND remaining>0 → Stop disabled
 *   Reset is always enabled
 *
 * @param {{ remaining: number, running: boolean }} state
 * @returns {{ startDisabled: boolean, stopDisabled: boolean }}
 */
export function getTimerButtonStates({ remaining, running }) {
  return {
    startDisabled: running || remaining === 0,
    stopDisabled:  !running,
  };
}

/* ============================================================
   TodoWidget pure functions
   Exported so they can be unit/property tested in isolation.
   ============================================================ */

/**
 * Validate a task description against a list of existing tasks.
 * Rules:
 *   - Must not be empty / whitespace-only
 *   - Must be ≤ 200 characters
 *   - Must not duplicate an existing task (case- and whitespace-insensitive),
 *     unless the matching task has the given excludeId
 *
 * @param {string} description
 * @param {Array<{id: string, description: string, done: boolean}>} tasks
 * @param {string} [excludeId]
 * @returns {{ valid: boolean, error: string }}
 */
export function validateTask(description, tasks, excludeId) {
  const trimmed = description.trim();
  if (!trimmed) {
    return { valid: false, error: 'Task description cannot be empty.' };
  }
  if (trimmed.length > 200) {
    return { valid: false, error: 'Task description must be 200 characters or fewer.' };
  }
  if (isDuplicateTask(trimmed, tasks, excludeId)) {
    return { valid: false, error: 'This task already exists.' };
  }
  return { valid: true, error: '' };
}

/**
 * Check whether a description matches any existing task (case- and
 * whitespace-insensitive), optionally excluding the task with excludeId.
 *
 * @param {string} description  Description to check (will be trimmed + lowercased).
 * @param {Array<{id: string, description: string}>} tasks
 * @param {string} [excludeId]
 * @returns {boolean}
 */
export function isDuplicateTask(description, tasks, excludeId) {
  const normalised = description.trim().toLowerCase();
  return tasks.some(
    (task) => task.id !== excludeId && task.description.trim().toLowerCase() === normalised,
  );
}
