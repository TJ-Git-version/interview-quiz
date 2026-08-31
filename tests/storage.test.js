// tests/storage.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/storage.js';

function fakeBackend() {
  const map = {};
  return {
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => { map[k] = String(v); },
    removeItem: (k) => { delete map[k]; },
  };
}

test('空状态下默认值', () => {
  const b = fakeBackend();
  const store = createStore(b);
  const s = store.load();
  assert.equal(s.version, 1);
  assert.deepEqual(s.files, {});
  assert.deepEqual(s.mastery, {});
});

test('set/get Mastery 持久化', () => {
  const b = fakeBackend();
  const store = createStore(b);
  let s = store.load();
  store.setMastery(s, 'baguwen:1', 3);
  s = store.load();
  assert.equal(store.getMastery(s, 'baguwen:1'), 3);
  assert.equal(store.getMastery(s, 'baguwen:2'), 0);
});

test('set/get LastId 持久化', () => {
  const b = fakeBackend();
  const store = createStore(b);
  let s = store.load();
  store.setLastId(s, 'baguwen', 'baguwen:7');
  s = store.load();
  assert.equal(store.getLastId(s, 'baguwen'), 'baguwen:7');
  assert.equal(store.getLastId(s, 'star'), null);
});

test('损坏数据回退默认', () => {
  const b = fakeBackend();
  b.setItem('interview-quiz:v1', '{bad json');
  const store = createStore(b);
  const s = store.load();
  assert.equal(s.version, 1);
  assert.deepEqual(s.mastery, {});
});
