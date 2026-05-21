/**
 * tests/utils.test.js
 *
 * Scaffold tests for the shared utilities in js/utils.js.
 * These tests verify that the Storage module and generateId helper
 * work correctly in isolation (no browser globals required).
 *
 * Requirements: NFR-1.2, NFR-1.3, 8.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { generateId, createStorage, DEFAULT_STATE } from '../js/utils.js';

/* ============================================================
   Simple in-memory mock for localStorage
   ============================================================ */
function createMockStore(initialData = {}) {
  const data = { ...initialData };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = value;
    },
    removeItem(key) {
      delete data[key];
    },
    _data: data,
  };
}

/* ============================================================
   generateId — unit tests
   ============================================================ */
describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('matches UUID-v4 format', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(generateId()).toMatch(uuidRegex);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId()));
    expect(ids.size).toBe(1000);
  });
});

/* ============================================================
   Storage — unit tests
   ============================================================ */
describe('Storage.get', () => {
  it('returns fallback when key is absent', () => {
    const store = createMockStore();
    const storage = createStorage(store);
    expect(storage.get('missing', 'default')).toBe('default');
  });

  it('returns fallback when stored value is corrupted JSON', () => {
    const store = createMockStore({ bad: 'not-valid-json{{{' });
    const storage = createStorage(store);
    expect(storage.get('bad', [])).toEqual([]);
  });

  it('returns parsed value when key exists with valid JSON', () => {
    const store = createMockStore({ tasks: JSON.stringify([{ id: '1', text: 'Buy milk', done: false }]) });
    const storage = createStorage(store);
    expect(storage.get('tasks', [])).toEqual([{ id: '1', text: 'Buy milk', done: false }]);
  });

  it('returns fallback (not null) when key is absent', () => {
    const store = createMockStore();
    const storage = createStorage(store);
    expect(storage.get('theme', 'light')).toBe('light');
  });
});

describe('Storage.set', () => {
  it('persists a value that can be retrieved with get', () => {
    const store = createMockStore();
    const storage = createStorage(store);
    storage.set('theme', 'dark');
    expect(storage.get('theme', 'light')).toBe('dark');
  });

  it('does not throw when the store throws QuotaExceededError', () => {
    const throwingStore = {
      getItem: () => null,
      setItem: () => { throw new DOMException('QuotaExceededError'); },
      removeItem: () => {},
    };
    const storage = createStorage(throwingStore);
    expect(() => storage.set('key', 'value')).not.toThrow();
  });

  it('serialises arrays correctly', () => {
    const store = createMockStore();
    const storage = createStorage(store);
    const tasks = [{ id: 'abc', text: 'Task 1', done: false }];
    storage.set('tasks', tasks);
    expect(storage.get('tasks', [])).toEqual(tasks);
  });
});

describe('Storage.remove', () => {
  it('removes an existing key', () => {
    const store = createMockStore({ greeting_name: '"Alex"' });
    const storage = createStorage(store);
    storage.remove('greeting_name');
    expect(storage.get('greeting_name', '')).toBe('');
  });

  it('does not throw when removing a non-existent key', () => {
    const store = createMockStore();
    const storage = createStorage(store);
    expect(() => storage.remove('nonexistent')).not.toThrow();
  });

  it('does not throw when the store throws on removeItem', () => {
    const throwingStore = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => { throw new Error('SecurityError'); },
    };
    const storage = createStorage(throwingStore);
    expect(() => storage.remove('key')).not.toThrow();
  });
});

/* ============================================================
   DEFAULT_STATE — unit tests
   ============================================================ */
describe('DEFAULT_STATE', () => {
  it('has empty tasks array', () => {
    expect(DEFAULT_STATE.tasks).toEqual([]);
  });

  it('has empty links array', () => {
    expect(DEFAULT_STATE.links).toEqual([]);
  });

  it('has empty greetingName string', () => {
    expect(DEFAULT_STATE.greetingName).toBe('');
  });

  it('defaults theme to light', () => {
    expect(DEFAULT_STATE.theme).toBe('light');
  });
});

/* ============================================================
   Property-based tests
   ============================================================ */
describe('generateId — property tests', () => {
  it('always produces a valid UUID-v4 format', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(generateId()).toMatch(uuidRegex);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Storage — property tests', () => {
  // Feature: todo-dashboard, Property 16: Corrupted LocalStorage data always yields the safe fallback
  it('corrupted JSON always returns the fallback without throwing', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          try { JSON.parse(s); return false; } catch { return true; }
        }),
        fc.anything(),
        (corruptedValue, fallback) => {
          const store = createMockStore({ key: corruptedValue });
          const storage = createStorage(store);
          let result;
          expect(() => { result = storage.get('key', fallback); }).not.toThrow();
          // The result must equal the fallback (deep equality)
          expect(result).toEqual(fallback);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('set then get round-trips any JSON-serialisable value', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.jsonValue(),
        (key, value) => {
          const store = createMockStore();
          const storage = createStorage(store);
          storage.set(key, value);
          expect(storage.get(key, null)).toEqual(value);
        },
      ),
      { numRuns: 100 },
    );
  });
});
