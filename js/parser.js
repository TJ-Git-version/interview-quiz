// js/parser.js —— 题库 markdown 解析

function isImportant(text) {
  return /【重点】/.test(text || '');
}

function stripMarkdown(s) {
  return String(s || '').replace(/[*`]/g, '');
}

// 八股文：一级标题 # 章节；**N. 问题**；答案为后续非题目行
export function parseBaguwen(md) {
  const lines = String(md).split(/\r?\n/);
  const sections = [];
  let section = { title: '', questions: [] };
  let currentQ = null;

  const flushSection = () => {
    if (section.title || section.questions.length) {
      sections.push(section);
    }
    section = { title: '', questions: [] };
    currentQ = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    const heading = line.match(/^#\s+(.+)$/);
    if (heading && !line.startsWith('## ')) {
      flushSection();
      section = { title: heading[1].trim(), questions: [] };
      currentQ = null;
      continue;
    }
    const qMatch = line.match(/^\*\*(\d+)\.\s*(.+?)\*\*$/);
    if (qMatch) {
      const qText = stripMarkdown(qMatch[2]).trim().replace(/【重点[^】]*】/, '').trim();
        currentQ = { question: qText, answer: '', important: isImportant(raw) || /【重点/.test(qMatch[2]) };
      section.questions.push(currentQ);
      continue;
    }
    if (currentQ && line) {
      currentQ.answer += (line.startsWith('>') ? line.replace(/^>\s?/, '') : line) + '\n';
    }
  }
  flushSection();

  const questions = [];
  let index = 1;
  for (const s of sections) {
    for (const q of s.questions) {
      q.answer = q.answer.trim();
      q.important = q.important || isImportant(q.answer);
      questions.push({
        id: `baguwen:${index}`,
        file: 'baguwen',
        section: s.title,
        index,
        question: q.question,
        answer: q.answer,
        important: q.important,
        kind: 'qa',
      });
      index++;
    }
  }
  return questions;
}

function stripArrow(line) {
  return String(line).replace(/^\s*(?:[→>]\s*|[-*•]\s*)/, '').trim();
}

function parseNumberedQA(lines, section) {
  const items = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    const qm = line.match(/^(\d+)\.\s*\*\*(.+?)\*\*\s*$/);
    if (qm) {
      if (cur) { cur.answer = cur.answer.trim(); items.push(cur); }
      const qText = stripMarkdown(qm[2]).trim().replace(/【重点[^】]*】/, '').trim();
      cur = { question: qText, answer: '', important: isImportant(raw) || /【重点/.test(qm[2]) };
      continue;
    }
    if (cur && line) {
      const a = stripArrow(line);
      if (a) cur.answer += a + '\n';
    }
  }
  if (cur) { cur.answer = cur.answer.trim(); items.push(cur); }
  return items.map((it) => ({
    section, kind: 'qa',
    question: it.question, answer: it.answer, important: it.important,
  }));
}

function parseNumberedOpen(lines, section) {
  const items = [];
  for (const raw of lines) {
    const line = raw.trim();
    const qm = line.match(/^(\d+)\.\s+(.+)$/);
    if (qm) {
      items.push({
        section, kind: 'open', question: stripMarkdown(qm[2]).trim(),
        answer: '', important: isImportant(raw),
      });
    }
  }
  return items;
}

function recitalEntry(section, lines) {
  const content = lines
    .map((l) => l.replace(/^\s*>\s?/, '').trim())
    .filter(Boolean)
    .join('\n');
  return { section, kind: 'recital', question: section, answer: content, important: false };
}

// STAR：以 # 项目 分块；## 高频追问 -> qa；## 通用追问清单 -> open；其余 -> recital
export function parseStar(md) {
  const lines = String(md).split(/\r?\n/);
  const blocks = [];
  let h1 = '', h2 = '', cur = null;
  const push = () => { if (cur) blocks.push(cur); };

  for (const raw of lines) {
    const t = raw.trim();
    const m1 = t.match(/^#\s+(.+)$/);
    const m2 = t.match(/^##\s+(.+)$/);
    if (m1 && !m2) {
      push();
      h1 = m1[1].trim(); h2 = '';
      cur = { h1, h2: '', lines: [] };
    } else if (m2) {
      push();
      h2 = m2[1].trim();
      cur = { h1, h2, lines: [] };
    } else if (cur) {
      cur.lines.push(raw);
    }
  }
  push();

  const rawEntries = [];
  for (const b of blocks) {
    const heading = [b.h1, b.h2].filter(Boolean).join(' · ');
    if (/高频追问/.test(heading)) {
      rawEntries.push(...parseNumberedQA(b.lines, heading));
    } else if (/通用追问/.test(heading)) {
      rawEntries.push(...parseNumberedOpen(b.lines, heading));
    } else {
      rawEntries.push(recitalEntry(heading, b.lines));
    }
  }

  return rawEntries.map((e, i) => {
    const idx = i + 1;
    return { ...e, id: `star:${idx}`, file: 'star', index: idx, important: false };
  });
}



// 面试口语版：##/### 题号（1. ）作为问题；##/### 非数字 作为专题；**标签**：内容 作为答案分段
export function parseKouyu(md, fileKey, fallbackTitle) {
  const lines = String(md).split(/\r?\n/);
  const entries = [];
  let index = 1;
  let section = fallbackTitle || '';
  let currentQ = null;

  const heading = (line) => {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    return m ? { level: m[1].length, text: m[2].trim() } : null;
  };
  const isQuestion = (text) => /^\d+\.\s+/.test(text);

  const flush = () => {
    if (currentQ) { entries.push(currentQ); currentQ = null; }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const h = heading(line);
    if (h) {
      if (isQuestion(h.text)) {
        flush();
        const qText = stripMarkdown(h.text).replace(/^\d+\.\s*/, '').replace(/【重点[^】]*】/, '').trim();
        currentQ = { section, question: qText, answer: '', important: (/【重点/.test(h.text) || /重点/.test(section)) };
      } else {
        flush();
        section = stripMarkdown(h.text).trim() || section;
      }
      continue;
    }
    if (currentQ && line) {
      const lbl = line.match(/^\*\*([^*]+)\*\*[:：]?\s*(.*)$/);
      if (lbl) {
        currentQ.answer += `${lbl[1]}：${lbl[2]}\n`;
      } else {
        currentQ.answer += line + '\n';
      }
    }
  }
  flush();

  return entries.map((e) => {
    const idx = index++;
    return {
      id: `${fileKey}:${idx}`,
      file: fileKey,
      section: e.section,
      index: idx,
      question: e.question,
      answer: e.answer.trim(),
      important: e.important,
      kind: 'qa',
    };
  });
}



