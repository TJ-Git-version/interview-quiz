// js/storage.js —— localStorage 状态封装
const KEY = 'interview-quiz:v1';

const DEFAULT = {
  version: 1,
  files: {},   // { [fileKey]: { lastId } }
  mastery: {}, // { [entryId]: 0|1|2|3 }
  history: [], // 作答记录，最多保留最近 5 次
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
        history: Array.isArray(parsed.history) ? parsed.history : [],
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
    getHistory(state) { return Array.isArray(state.history) ? state.history : []; },
    addHistory(state, entry) {
      if (!Array.isArray(state.history)) state.history = [];
      state.history.unshift(entry);
      if (state.history.length > 5) state.history.length = 5;
      write(state);
    },
    clearHistory(state) { state.history = []; write(state); },
  };
}
