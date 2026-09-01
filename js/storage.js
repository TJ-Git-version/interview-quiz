// js/storage.js —— localStorage 状态封装
const KEY = 'interview-quiz:v1';

const DEFAULT = {
  version: 1,
  files: {},   // { [fileKey]: { lastId } }
  mastery: {}, // { [entryId]: 0|1|2|3 }
  history: [], // 作答记录（全局时间线，最多保留最近 5 次）
  qHistory: {}, // 每题作答记录：{ [入口id]: [作答...] }，每题最多保留 5 次
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
        qHistory: parsed.qHistory && typeof parsed.qHistory === 'object' ? parsed.qHistory : {},
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
      if (entry && entry.id) {
        if (typeof state.qHistory !== 'object' || !state.qHistory) state.qHistory = {};
        const list = Array.isArray(state.qHistory[entry.id]) ? state.qHistory[entry.id] : [];
        list.unshift(entry);
        if (list.length > 5) list.length = 5;
        state.qHistory[entry.id] = list;
      }
      write(state);
    },
    getQHistory(state, id) {
      return state.qHistory && Array.isArray(state.qHistory[id]) ? state.qHistory[id] : [];
    },
    clearHistory(state) { state.history = []; state.qHistory = {}; write(state); },
  };
}
