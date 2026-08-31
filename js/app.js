// js/app.js —— 视图渲染与交互
import { parseBaguwen, parseStar } from './parser.js';
import { createStore } from './storage.js';

const store = createStore(window.localStorage);

const FILES = [
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
let curFile = null;
let queue = [];
let qIdx = 0;
let queueFile = null;

const $ = (s) => document.querySelector(s);
const drillable = (e) => e.kind === 'qa' || e.kind === 'open';
const dotClass = (lv) => (lv === 0 ? 'dot-gray' : lv === 1 ? 'dot-red' : lv === 2 ? 'dot-yellow' : 'dot-green');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
  queue = curFile.entries.filter(drillable);
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
  else renderStats();
}

function renderList() {
  const v = $('#view-list');
  if (!curFile) { v.innerHTML = '<p class="card">未加载题库</p>'; return; }

  const fileSel = data
    .map((f) => `<option value="${f.key}" ${f.key === curFile.key ? 'selected' : ''}>${esc(f.title)}</option>`)
    .join('');
  const chips = Object.entries(FILTERS)
    .map(([k, label]) => `<button class="chip ${filter === k ? 'on' : ''}" data-filter="${k}">${label}</button>`)
    .join('');

  const groups = {};
  for (const e of curFile.entries) {
    if (!drillable(e)) continue;
    const lv = store.getMastery(state, e.id);
    if (!FILTER_KEEP[filter](lv)) continue;
    (groups[e.section] = groups[e.section] || []).push(e);
  }

  let html = `<div class="card">
    <select id="file-sel" class="select">${fileSel}</select>
    <div class="chips">${chips}</div>
  </div>`;

  for (const [sec, items] of Object.entries(groups)) {
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

  v.querySelector('#file-sel').addEventListener('change', (ev) => { filter = 'all'; selectFile(ev.target.value); });
  v.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; renderView(); }));
  v.querySelectorAll('.q-row').forEach((b) => b.addEventListener('click', () => startPracticeAt(b.dataset.id)));
}

function startPracticeAt(id) {
  if (!curFile) return;
  const items = curFile.entries.filter(drillable);
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

  v.innerHTML = `
    <div class="card">
      <div class="progress">第 ${qIdx + 1} / ${queue.length} 题 · ${esc(title)} · ${esc(e.section)}</div>
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
    </div>`;

  const reveal = v.querySelector('#reveal');
  if (reveal) reveal.addEventListener('click', () => {
    const box = v.querySelector('#answer-box');
    box.classList.remove('hidden');
    v.querySelector('#answer-content').innerHTML = esc(e.answer).replace(/\n/g, '<br>');
    reveal.classList.add('hidden');
  });

  v.querySelectorAll('.level').forEach((b) => b.addEventListener('click', () => {
    state = store.load();
    store.setMastery(state, e.id, Number(b.dataset.lv));
    renderPractice();
  }));

  v.querySelector('#prev').addEventListener('click', () => {
    if (qIdx > 0) { qIdx--; renderPractice(); }
  });
  v.querySelector('#next').addEventListener('click', () => {
    if (qIdx < queue.length - 1) { qIdx++; renderPractice(); }
    else { alert('本组题目已做完 🎉'); }
  });
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

(async () => {
  await loadAll();
  selectFile(data[0]?.key);
})();
