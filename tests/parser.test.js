// tests/parser.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBaguwen, parseStar } from '../js/parser.js';

const fixture = `# 一、Java 基础

**1. == 和 equals 的区别？**
== 比较内存地址；equals 默认也是地址比较，但 String 重写后比较内容。

**2. HashMap 原理？【重点】**
数组+链表+红黑树，key 的 hash 求下标。

# 二、Java 并发（重点）

**3. volatile 作用与原理？**
保证可见性、禁止指令重排。`;

test('parseBaguwen 解析出 3 道题', () => {
  const res = parseBaguwen(fixture);
  assert.equal(res.length, 3);
});

test('题目字段正确', () => {
  const res = parseBaguwen(fixture);
  assert.equal(res[0].file, 'baguwen');
  assert.equal(res[0].section, '一、Java 基础');
  assert.equal(res[0].question, '== 和 equals 的区别？');
  assert.ok(res[0].answer.includes('内存地址'));
  assert.equal(res[0].important, false);
});

test('【重点】标记被识别', () => {
  const res = parseBaguwen(fixture);
  assert.equal(res[1].important, true);
});

test('id 递增且含章节信息', () => {
  const res = parseBaguwen(fixture);
  assert.equal(res[2].id, 'baguwen:3');
  assert.equal(res[2].section, '二、Java 并发（重点）');
});

test('判断题面去掉星号与编号', () => {
  const res = parseBaguwen(fixture);
  assert.equal(res[0].question, '== 和 equals 的区别？');
  assert.equal(res[1].question, 'HashMap 原理？');
});

const starFixture = `# 项目一 · AI 医学教学智能体平台

## 一句话版（30s）
> 「面向医学院校的一体化 AI 教学平台……」

## 5 分钟深挖版（难点/取舍/排查）
- **难点 1：多智能体怎么不失控？**
- **取舍**：用 pgvector 而非 Milvus。

## 高频追问 + 答案（10+）
1. **为什么用多智能体，不直接一个大 prompt？**
  → 拆分职责可独立迭代、能并行。
2. **BaseAgent 抽象了哪些公共能力？**
  → 对话记忆、会话持久化、并发控制。

## 一句话武器
> 「多智能体 + 统一 SSE + RAG + 状态机。」

# 全项目通用追问清单
1. 你最挑战的一个点是什么？
2. 如果让你重做，会改哪里？

# 自我介绍 3 分钟模板（综合版）
> 面试官好，我叫xx。`;

test('parseStar 区分 qa / open / recital', () => {
  const res = parseStar(starFixture);
  const kinds = res.map((e) => e.kind);
  assert.ok(kinds.includes('qa'));
  assert.ok(kinds.includes('open'));
  assert.ok(kinds.includes('recital'));
});

test('parseStar 高频追问为 qa 且有答案', () => {
  const res = parseStar(starFixture);
  const qa = res.filter((e) => e.kind === 'qa');
  assert.equal(qa.length, 2);
  assert.ok(qa[0].answer.includes('拆分职责'));
});

test('parseStar 通用追问为 open 无答案', () => {
  const res = parseStar(starFixture);
  const open = res.filter((e) => e.kind === 'open');
  assert.equal(open.length, 2);
  assert.equal(open[0].answer, '');
});

test('parseStar 背诵参考为 recital', () => {
  const res = parseStar(starFixture);
  const recital = res.filter((e) => e.kind === 'recital');
  assert.ok(recital.length >= 1);
  assert.ok(recital.some((e) => e.section.includes('一句话版')));
});

test('parseStar id 递增', () => {
  const res = parseStar(starFixture);
  assert.equal(res[0].id, 'star:1');
  assert.equal(res[0].file, 'star');
});
