// js/storage.js —— localStorage 状态封装
const KEY = 'interview-quiz:v1';

const DEFAULT = {
  version: 1,
  files: {},   // { [fileKey]: { lastId } }
  mastery: {}, // { [entryId]: 0|1|2|3 }
};

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

export function createStore(backend) {
  const read = () => {
    try {
      const raw = backend.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      const parsed = JSON.parse(raw);
      return {
        version: parsed.version ?? DEFAULT.version,
        files: { ...(parsed.files || {}) },
        mastery: { ...(parsed.mastery || {}) },
      };
    } catch {
      return clone(DEFAULT);
    }
  };

  const write = (state) => {
    try { backend.setItem(KEY, JSON.stringify(state)); } catch { /* ignore quota/privacy */ }
  };

  return {
    load: read,
    save: write,
    getMastery(state, id) { return Number(state.mastery[id] ?? 0); },
    setMastery(state, id, level) { state.mastery[id] = level; write(state); },
    getLastId(state, fileKey) { return state.files[fileKey]?.lastId ?? null; },
    setLastId(state, fileKey, id) { state.files[fileKey] = { lastId: id }; write(state); },
  };
}
