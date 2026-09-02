# 面试题库（interview-quiz）

一个**纯前端**的刷题 PWA，托管在 GitHub Pages。用于面试准备：刷题、记住进度、标记掌握度。

## 功能

- 题库列表（按 文件 → 章节 → 题目 分组，掌握度圆点）
- 练习模式：先看题 → （可选）自答 → 看答案 → 标掌握度（生疏 / 会一点 / 熟练）
- 进度记忆：下次打开回到上次的题
- 统计：总题数 / 已练 / 熟练率 / 分章节薄弱点
- 【重点】题目标星
- iPhone Safari「添加到主屏幕」全屏 + 离线可用

## 本地运行

```bash
npm test          # 跑解析/存储单测
npx serve .      # 本地静态服务器，浏览器打开
```

## 题库内容

| 文件 | 内容 |
|---|---|
| content/baguwen.md | 八股文高频问答（短答案/骨架） |
| content/star.md | 项目 STAR 深挖（高频追问 / 通用追问 / 背诵参考） |
| content/kouyu01.md | 口语版 · Java基础与并发 |
| content/kouyu02.md | 口语版 · JVM与Spring全家桶 |
| content/kouyu03.md | 口语版 · MySQL |
| content/kouyu04.md | 口语版 · Redis与消息 |
| content/kouyu05.md | 口语版 · 网络与操作系统 |
| content/kouyu06.md | 口语版 · 大模型RAG与Agent |

## 云同步（可选）

- 在 App 右下角「⚙️ 设置」里填一个 **GitHub 私有仓库**（如 TJ-Git-version/interview-quiz-data）和一个 **fine-grained 令牌**（Contents 读写权限，仅限该仓库）。
- 掌握度 / 进度 / 历史会同步到该仓库的 data.json，手机与电脑可共用；主题仍是本机偏好。
- 令牌仅保存在浏览器本地，用于访问你自己的私有仓库。

## 更新题库内容

1. 改 `content/baguwen.md` / `content/star.md`（或重新运行脱敏脚本）。
2. `git add . && git commit && git push`。
3. 等 GitHub Pages 重新发布（约 1 分钟），手机上刷新即可。

## 数据与隐私

- 掌握度、进度只存在**手机浏览器本地（localStorage）**，不传服务器。
- 仓库只放脱敏题库，不含简历/PDF/真实姓名与真实量纲数字（真实数据用于自己背诵，未公开）。
- 清 Safari 网站数据会丢失掌握度，请勿随意清理。

## 部署到 GitHub Pages

1. 推送本仓库到 GitHub。
2. 仓库 Settings → Pages → Source 选 `main` 分支根目录。
3. 待发布后访问 `https://<用户名>.github.io/interview-quiz/`。


