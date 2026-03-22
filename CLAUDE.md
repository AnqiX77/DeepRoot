# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

DeepRoot 是一个以「递归式深度学习」为核心的个人知识库工具。用户在笔记中划选文字向 AI 追问，AI 的答案可一键存为子笔记，子笔记中又可以继续追问——形成一棵不断生长的「学习树」。所有用户数据存储在浏览器本地 IndexedDB 中，无需后端数据库。

## 常用命令

- `npm run dev` — 使用 Turbopack 启动开发服务器（端口 3000）
- `npm run build` — 生产构建（低内存机器可能需要 `NODE_OPTIONS=--max-old-space-size=4096`）
- `npm run lint` — ESLint 检查
- `npx tsc --noEmit` — 仅做类型检查，不输出文件

## 技术架构

**技术栈**：Next.js 15（App Router）、React 19、Tailwind CSS v4、Tiptap v3、IndexedDB（`idb`）、ReactFlow、MiniSearch。

**核心设计决策**：
- **客户端优先**：所有数据（笔记、标签、对话、向量）均存储在浏览器 IndexedDB 中，无后端数据库。
- **仅代理 API**：唯一的服务端代码是 `src/app/api/chat/route.ts`，负责代理智谱 AI GLM API 请求并以 SSE 流式返回，避免 API Key 暴露到客户端。
- **HTML 存储**：笔记内容以 HTML 格式存储（Tiptap 输出），非 Markdown。仅在导出时才转换为 Markdown。
- **本地 RAG**：`@xenova/transformers` 在浏览器端运行 embedding，向量存储在 IndexedDB 中。

**核心交互数据流（划选 → 提问 → 存为笔记）**：
1. 用户在 `NoteEditor` 中选中文字 → `SelectionMenu` 浮出
2. 点击「向 AI 提问」→ `AISidebarContext.openSidebar()` 携带选中文字和笔记上下文
3. `AISidebar` 发送 POST 到 `/api/chat` → Route Handler 调用 GLM API 并流式返回
4. 用户点击「存为笔记」→ `createNote()` 自动设置 `parentId` 为当前笔记
5. 触发 `window.dispatchEvent("tags-updated")`，侧边栏刷新标签

**状态管理**：`AISidebarContext`（React Context）是唯一的全局状态，其余均为组件本地状态 + IndexedDB 读取。

## 关键模块

| 路径 | 用途 |
|------|------|
| `src/lib/db.ts` | IndexedDB 数据层（v2 schema），包含所有 CRUD 操作，管理笔记父子关系和标签引用计数 |
| `src/lib/search.ts` | MiniSearch 全文搜索，支持中文分词，惰性构建索引，笔记保存时通过 `invalidateSearchIndex()` 失效 |
| `src/lib/rag.ts` | 浏览器端 embedding（`@xenova/transformers`），按 ~300 字分段，余弦相似度检索 |
| `src/lib/export.ts` | HTML→Markdown 转换，单篇导出 .md，全库导出 .zip（含图片） |
| `src/app/api/chat/route.ts` | SSE 代理智谱 GLM API，无 API Key 时返回 mock 响应 |

## 需要注意的非显而易见的模式

- **笔记链接**：编辑器中输入 `[[` 触发，存储为 `<span data-note-link="noteId">`。这些链接也会在知识树中生成棕色虚线连边。
- **标签计数**：tags store 中维护引用计数，需要时通过 `recalculateTagCounts()` 重新计算。
- **搜索索引**：在失效后的首次搜索时惰性重建，而非每次保存时重建。
- **`tags-updated` 事件**：自定义 DOM 事件，用于跨组件协调标签刷新（Sidebar 监听，笔记页面派发）。
- **Tiptap v3**：v3 不导出 `BubbleMenu`，用自定义 `SelectionMenu` 组件替代，基于 `window.getSelection()` 定位。
- **PDF worker**：`public/pdf.worker.min.mjs` 从 pdfjs-dist 复制到本地，避免 COEP 跨域问题。
- **`immediatelyRender: false`**：`useEditor` 必须设置此项，防止 Tiptap 的 SSR 水合错误。
- **`creatingRef` 守卫**：`notes/[id]/page.tsx` 中用 `useRef` 防止 React 严格模式下重复创建笔记。

## 样式规范

主题颜色定义在 `src/app/globals.css` 的 `@theme` 块中。主色为深绿色（`#166534`）。组件中使用 Tailwind 的 `text-primary`、`bg-primary` 等类名，不要硬编码颜色值。

## 环境配置

- `.env.local` 中设置 `ZHIPU_API_KEY`（生产环境在 Vercel 环境变量中配置）
- `next.config.ts` 配置了 COEP/COOP 头以支持 WASM
- `vercel.json` 设置函数超时为 60 秒，适配 AI 流式响应

## 语言要求

所有界面文本和面向用户的内容必须使用中文。
