// js/app.js —— 视图渲染与交互
import { parseBaguwen, parseStar, parseKouyu } from './parser.js';
import { createStore } from './storage.js';

const store = createStore(window.localStorage);

const KOUYU = [
  ['kouyu06', '口语·大模型RAG与Agent', '大模型RAG与Agent', '最高'],
  ['kouyu01', '口语·Java基础与并发', 'Java基础与并发', '高'],
  ['kouyu03', '口语·MySQL', 'MySQL', '高'],
  ['kouyu04', '口语·Redis与消息', 'Redis与消息', '高'],
  ['kouyu02', '口语·JVM与Spring全家桶', 'JVM与Spring全家桶', '高'],
  ['kouyu05', '口语·网络与操作系统', '网络与操作系统', '中'],
];

const FILES = [
  ...KOUYU.map(([key, title, sec, pri]) => ({ key, title, priority: pri, url: 'content/' + key + '.md', parser: (t) => parseKouyu(t, key, sec) })),
  { key: 'baguwen', title: '八股文高频问答', url: 'content/baguwen.md', parser: parseBaguwen },
  { key: 'star', title: '项目 STAR 深挖', url: 'content/star.md', parser: parseStar },
];

const FILTERS = { all: '全部', todo: '未练', weak: '薄弱', solid: '熟练' };
const FILTER_KEEP = {
  all: () => true,
  todo: (lv) => lv === 0,
  weak: (lv) => lv === 1 || lv === 2,
  solid: (lv) => lv === 3,
};

let data = [];
let state = store.load();
let currentTab = 'list';
let filter = 'all';
let onlyImportant = false;
let answerRevealed = false;
let curFile = null;
let queue = [];
let qIdx = 0;
let queueFile = null;

const $ = (s) => document.querySelector(s);
const drillable = (e) => e.kind === 'qa' || e.kind === 'open';
const dotClass = (lv) => (lv === 0 ? 'dot-gray' : lv === 1 ? 'dot-red' : lv === 2 ? 'dot-yellow' : 'dot-green');
const sortImportant = (arr) => [...arr.filter((e) => e.important), ...arr.filter((e) => !e.important)];
const currentDrillable = () => curFile.entries.filter(drillable).filter((e) => !onlyImportant || e.important);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function renderMd(s) {
  let html = esc(s);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

async function loadAll() {
  for (const f of FILES) {
    try {
      const res = await fetch(f.url);
      if (!res.ok) throw new Error(res.status);
      f.entries = f.parser(await res.text());
    } catch (e) {
      f.entries = [];
      console.warn('加载题库失败', f.url, e);
    }
  }
  data = FILES;
}

function selectFile(key) {
  curFile = data.find((f) => f.key === key) || data[0];
  renderTabs();
  renderView();
}

function renewQueue() {
  if (!curFile) return;
  answerRevealed = false;
  queue = sortImportant(currentDrillable());
  queueFile = curFile.key;
  const lastId = store.getLastId(state, curFile.key);
  const found = queue.findIndex((e) => e.id === lastId);
  qIdx = found >= 0 ? found : 0;
}

function renderTabs() {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === currentTab));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('hidden', v.id !== 'view-' + currentTab));
}

function renderView() {
  renderTabs();
  if (currentTab === 'list') renderList();
  else if (currentTab === 'practice') renderPractice();
  else if (currentTab === 'history') renderHistory();
  else renderStats();
}

function renderList() {
  const v = $('#view-list');
  if (!curFile) { v.innerHTML = '<p class="card">未加载题库</p>'; return; }

  const fileSel = data
    .map((f) => `<option value="${f.key}" ${f.key === curFile.key ? 'selected' : ''}>${esc(f.title)}${f.priority ? '【' + esc(f.priority) + '】' : ''}</option>`)
    .join('');
  const chips = Object.entries(FILTERS)
    .map(([k, label]) => `<button class="chip ${filter === k ? 'on' : ''}" data-filter="${k}">${label}</button>`)
    .join('') + `<button class="chip ${onlyImportant ? 'on' : ''}" data-f="important">⭐ 只看重要</button>`;

  const groups = {};
  for (const e of curFile.entries) {
    if (!drillable(e)) continue;
    if (onlyImportant && !e.important) continue;
    const lv = store.getMastery(state, e.id);
    if (!FILTER_KEEP[filter](lv)) continue;
    (groups[e.section] = groups[e.section] || []).push(e);
  }

  let html = `<div class="card">
    <select id="file-sel" class="select">${fileSel}</select>
    <div class="chips">${chips}</div>
  </div>`;

  for (const [sec, rawItems] of Object.entries(groups)) {
    const items = sortImportant(rawItems);
    html += `<div class="sec"><div class="sec-title">${esc(sec)}</div>`;
    for (const e of items) {
      const lv = store.getMastery(state, e.id);
      html += `<button class="q-row" data-id="${esc(e.id)}">
        <span class="dot ${dotClass(lv)}"></span>
        <span class="q-text">${e.important ? '⭐ ' : ''}${esc(e.question)}</span>
      </button>`;
    }
    html += `</div>`;
  }
  if (!Object.keys(groups).length) html += '<p class="card">当前筛选没有题目</p>';
  v.innerHTML = html;

  v.querySelector('#file-sel').addEventListener('change', (ev) => { filter = 'all'; onlyImportant = false; selectFile(ev.target.value); });
  v.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; renderView(); }));
  const impBtn = v.querySelector('[data-f="important"]');
  if (impBtn) impBtn.addEventListener('click', () => { onlyImportant = !onlyImportant; renderView(); });
  v.querySelectorAll('.q-row').forEach((b) => b.addEventListener('click', () => startPracticeAt(b.dataset.id)));
}

function startPracticeAt(id) {
  if (!curFile) return;
  answerRevealed = false;
  const items = sortImportant(currentDrillable());
  queue = items;
  queueFile = curFile.key;
  qIdx = queue.findIndex((e) => e.id === id);
  if (qIdx < 0) qIdx = 0;
  currentTab = 'practice';
  renderView();
}

function renderPractice() {
  const v = $('#view-practice');
  if (!queue.length) { v.innerHTML = '<p class="card">没有题目</p>'; return; }
  const e = queue[qIdx];
  const title = FILES.find((f) => f.key === curFile.key)?.title || curFile.title;
  const isOpen = e.kind === 'open';
  store.setLastId(state, curFile.key, e.id);

  const prevList = store.getQHistory(state, e.id);
  let prevHtml = '';
  if (prevList.length) {
    prevHtml = '<div class="card"><div class="sec-title">本道题 · 之前作答</div>';
    for (const h of prevList) {
      prevHtml += '<div class="hist" data-uid="' + esc(h.uid || '') + '"><div class="hist-time"><span>' + esc(fmtTime(h.t)) + ' · ' + levelLabel(h.level) + '</span></div>'
        + (h.self ? '<details class="hist-self"><summary>我的回答</summary><div>' + esc(h.self).replace(/\n/g, '<br>') + '</div></details>' : '<div class="hist-meta">（无文字作答）</div>')
        + '</div>';
    }
    prevHtml += '</div>';
  }

  v.innerHTML = `
    <div class="card">
      <div class="progress">第 ${qIdx + 1} / ${queue.length} 题 · ${esc(title)}${curFile.priority ? '【' + esc(curFile.priority) + '】' : ''} · ${esc(e.section)}</div>
      <div class="q-block">${e.important ? '<div class="badge">⭐ 重点</div>' : ''}${esc(e.question)}</div>
    </div>
    <div class="card">
      <details id="self-answer"><summary>✍️ 自我回答（可选）</summary>
        <textarea id="my-answer" rows="4" placeholder="先写下你的答案，再看标准答案对照。"></textarea>
      </details>
      ${isOpen ? '' : '<button id="reveal" class="btn primary">看答案</button>'}
      <div id="answer-box" class="hidden"><div id="answer-content"></div></div>
      <div class="level-row">
        <button class="level" data-lv="1">生疏</button>
        <button class="level" data-lv="2">会一点</button>
        <button class="level" data-lv="3">熟练</button>
      </div>
      <div class="nav-row">
        <button id="prev" class="btn">上一题</button>
        <button id="next" class="btn primary">下一题</button>
      </div>
    </div>${prevHtml}`;

  const reveal = v.querySelector('#reveal');
  const box = v.querySelector('#answer-box');
  const content = v.querySelector('#answer-content');
  if (answerRevealed && reveal) {
    content.innerHTML = renderMd(e.answer);
    box.classList.remove('hidden');
    reveal.textContent = '隐藏答案';
  }
  if (reveal) reveal.addEventListener('click', () => {
    if (box.classList.contains('hidden')) {
      content.innerHTML = renderMd(e.answer);
      box.classList.remove('hidden');
      reveal.textContent = '隐藏答案';
      answerRevealed = true;
    } else {
      box.classList.add('hidden');
      reveal.textContent = '看答案';
      answerRevealed = false;
    }
  });

  v.querySelectorAll('.level').forEach((b) => b.addEventListener('click', () => {
    const selfBox = v.querySelector('#my-answer');
    const self = selfBox ? selfBox.value.trim() : '';
    const lv = Number(b.dataset.lv);
    state = store.load();
    store.setMastery(state, e.id, lv);
    const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    store.addHistory(state, { id: e.id, uid, t: Date.now(), file: curFile.key, title, section: e.section, question: e.question, level: lv, self });
    renderPractice();
  }));

  v.querySelector('#prev').addEventListener('click', () => {
    if (qIdx > 0) { qIdx--; answerRevealed = false; renderPractice(); }
  });
  v.querySelector('#next').addEventListener('click', () => {
    if (qIdx < queue.length - 1) { qIdx++; answerRevealed = false; renderPractice(); }
    else { alert('本组题目已做完 🎉'); }
  });
  v.querySelectorAll('.hist[data-uid]').forEach((elm) => attachLongPress(elm, elm.dataset.uid));
}

const LEVEL_LABELS = { 1: '生疏', 2: '会一点', 3: '熟练' };
const levelLabel = (lv) => LEVEL_LABELS[lv] || '未练';

function fmtTime(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (isToday) return '今天 ' + hm;
  const y = d.getFullYear() === today.getFullYear() ? '' : d.getFullYear() + '-';
  return y + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + hm;
}

function attachLongPress(elm, uid) {
  if (!uid) return;
  let timer = null;
  const start = (e) => {
    if (e.button != null && e.button !== 0) return;
    timer = setTimeout(() => {
      timer = null;
      if (confirm('删除这条作答记录？')) {
        state = store.load();
        store.removeHistoryEntry(state, uid);
        if (currentTab === 'history') renderHistory();
        else renderPractice();
      }
    }, 600);
  };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  elm.addEventListener('pointerdown', start);
  elm.addEventListener('pointerup', cancel);
  elm.addEventListener('pointerleave', cancel);
  elm.addEventListener('pointercancel', cancel);
}

function renderHistory() {
  const v = document.querySelector('#view-history');
  state = store.load();
  const history = store.getHistory(state);
  if (!history.length) {
    v.innerHTML = '<p class="card">还没有作答记录。完成一道题（点「生疏 / 会一点 / 熟练」）后，这里会记录最近 5 次。</p>';
    return;
  }
  let html = '<div class="card"><div class="sec-title">最近 5 次作答</div><button id="clear-hist" class="btn">清空记录</button></div>';
  for (const h of history) {
    html += '<div class="card hist" data-uid="' + esc(h.uid || '') + '">'
      + '<div class="hist-time"><span>' + esc(fmtTime(h.t)) + '</span></div>'
      + '<div class="hist-q">' + esc(h.question) + '</div>'
      + '<div class="hist-meta">' + esc(h.title || '') + ' · ' + esc(h.section || '') + ' · 掌握：' + levelLabel(h.level) + '</div>'
      + (h.self ? '<details class="hist-self"><summary>我的回答</summary><div>' + esc(h.self).replace(/\n/g, '<br>') + '</div></details>' : '')
      + '</div>';
  }
  v.innerHTML = html;
  const clear = v.querySelector('#clear-hist');
  if (clear) clear.addEventListener('click', () => {
    if (confirm('确定清空作答历史？')) {
      state = store.load();
      store.clearHistory(state);
      renderHistory();
    }
  });
  v.querySelectorAll('.hist[data-uid]').forEach((elm) => attachLongPress(elm, elm.dataset.uid));
}

function renderStats() {
  const v = $('#view-stats');
  let total = 0, done = 0, solid = 0;
  const bySec = {};
  for (const f of data) {
    for (const e of f.entries) {
      if (!drillable(e)) continue;
      total++;
      const lv = store.getMastery(state, e.id);
      if (lv > 0) done++;
      if (lv === 3) solid++;
      const sec = `${f.title} · ${e.section}`;
      const s = (bySec[sec] = bySec[sec] || { total: 0, done: 0, solid: 0, c1: 0, c2: 0, c3: 0 });
      s.total++;
      if (lv > 0) { s.done++; s['c' + lv]++; }
      if (lv === 3) s.solid++;
    }
  }

  let html = `<div class="card stat-top">
    <div><b>${total}</b><span>题目</span></div>
    <div><b>${done}</b><span>已练</span></div>
    <div><b>${total ? Math.round((solid / total) * 100) : 0}%</b><span>熟练率</span></div>
  </div>`;

  for (const [sec, s] of Object.entries(bySec)) {
    const pct = Math.round((s.done / s.total) * 100);
    html += `<div class="card stat-sec">
      <div class="sec-title">${esc(sec)}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="stat-nums">生疏 ${s.c1} · 会一点 ${s.c2} · 熟练 ${s.c3}（${s.done}/${s.total}）</div>
    </div>`;
  }
  if (!total) html += '<p class="card">暂无数据</p>';
  v.innerHTML = html;
}

document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => {
    currentTab = t.dataset.tab;
    if (currentTab === 'practice' && queueFile !== (curFile && curFile.key)) renewQueue();
    renderView();
  })
);

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.querySelector('#theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#111827');
}
function initTheme() {
  let theme = 'light';
  try { theme = localStorage.getItem('interview-quiz:theme') || 'light'; } catch {}
  applyTheme(theme);
}

(async () => {
  initTheme();
  const themeBtn = document.querySelector('#theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('interview-quiz:theme', next); } catch {}
  });
  await loadAll();
  selectFile(data[0]?.key);
})();




