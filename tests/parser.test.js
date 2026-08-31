// tests/parser.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBaguwen, parseStar, parseKouyu } from '../js/parser.js';

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

const kouyuFixture = `# 01 · Java 基础与并发（口语版）

> 每题 = 【结论】→ 展开 → 举例/取舍 →【追问备用】。

---

## 1. == 和 equals 的区别？

**结论**：== 比地址，equals 看怎么重写。
**展开**：== 对基本类型比的是值。
**追问备用**：那重写 equals 要注意什么？—— 一定要重写 hashCode。

---

## 一、JVM

### 1. JVM 内存区域？

**结论**：堆 + 方法区是共享的。
**展开**：堆放对象，是 GC 主战场。

### 2. OOM 排查？【重点】

**结论**：先看线程、再抓堆 dump。
**结合项目**：我项目里盯无界缓存、线程池。`;

test('parseKouyu 一级/二级题目都能解析', () => {
  const res = parseKouyu(kouyuFixture, 'kouyu01', 'Java基础与并发');
  assert.equal(res.length, 3);
});

test('parseKouyu 标签被转为分节', () => {
  const res = parseKouyu(kouyuFixture, 'kouyu01', 'Java基础与并发');
  assert.ok(res[0].answer.includes('结论：== 比地址'));
  assert.ok(res[0].answer.includes('展开：== 对基本类型比的是值'));
  assert.ok(res[0].answer.includes('追问备用：那重写 equals'));
});

test('parseKouyu 二级专题作 section', () => {
  const res = parseKouyu(kouyuFixture, 'kouyu01', 'Java基础与并发');
  assert.equal(res[1].section, '一、JVM');   // 二级专题下
  assert.equal(res[1].question, 'JVM 内存区域？');
});

test('parseKouyu 【重点】标记', () => {
  const res = parseKouyu(kouyuFixture, 'kouyu01', 'Java基础与并发');
  assert.equal(res[2].important, true);
  assert.ok(!res[2].question.includes('【重点】'));
});

test('parseKouyu id/file 正确', () => {
  const res = parseKouyu(kouyuFixture, 'kouyu01', 'Java基础与并发');
  assert.equal(res[0].section, 'Java基础与并发'); // 一级文件专题取 fallbackTitle\n  assert.equal(res[0].id, 'kouyu01:1');
  assert.equal(res[0].file, 'kouyu01');
  assert.equal(res[0].kind, 'qa');
});


