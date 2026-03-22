# 个人知识库产品 · AI Coding 需求指令

---

## 产品定位

构建一个以「递归式深度学习」为核心的个人知识库工具。
核心理念：用户在阅读笔记时，可以随时划选内容向 AI 追问，AI 的答案可一键存为新笔记，新笔记中又可以继续追问——形成一棵不断生长的「学习树」。

---

## 技术栈要求

- 前端框架：**Next.js 14+（App Router）**，部署目标为 Vercel
- 样式：Tailwind CSS
- 编辑器：`tiptap`（支持 Markdown、划选 BubbleMenu 扩展）
- 数据存储：**浏览器端 IndexedDB**（用户数据留在本地，无需登录/后端数据库）
- AI 调用：通过 **Next.js Route Handler**（`app/api/` 目录）代理智谱 AI GLM API，支持流式输出；API Key 存放在 Vercel 环境变量 `ZHIPU_API_KEY` 中，不暴露到客户端
- 联网搜索：使用 GLM 原生 `web_search` 工具，无需第三方搜索 API，直接在调用时启用即可
- 向量检索（RAG）：使用 `@xenova/transformers` 在浏览器端本地 embedding，无需后端向量数据库

---

## 页面结构

```
/                   → 知识树可视化主页
/notes              → 笔记列表（按标签/目录组织）
/notes/:id          → 笔记详情 + 编辑器
/chat               → 独立 AI 聊天界面
```

---

## 阶段一：MVP 功能（必须实现）

### 1. Markdown 笔记编辑器

**编辑形态**：所见即所得（WYSIWYG），实时渲染，风格参考 Notion。

**支持的 Markdown 元素**：
- 标题 H1 / H2 / H3
- 正文段落
- 粗体、斜体、行内代码
- 无序列表、有序列表
- 代码块（支持语言高亮）
- 引用块（blockquote）
- 分割线

**图片支持**：
- 支持粘贴图片自动上传（或转为 base64 存储）
- 支持拖拽图片插入
- 图片在编辑器内行内渲染，可调整宽度

**笔记元数据**：
- 标题（自动提取第一行 H1 或手动填写）
- 创建时间 / 最后修改时间
- 所属标签列表（可多选）
- 父笔记 ID（用于构建知识树父子关系）
- 字数统计

**自动保存**：
- 用户停止输入 1 秒后自动保存
- 顶部显示「已保存」状态提示

---

### 2. 划选文字向 AI 提问（核心交互）

这是整个产品最重要的交互，需要重点打磨。

**交互流程**：
1. 用户在笔记编辑器中用鼠标划选任意一段文字
2. 划选后，在选区附近浮出一个小工具条，包含：
   - 「向 AI 提问」按钮
   - 「高亮标注」按钮（可选，阶段二）
3. 点击「向 AI 提问」后，弹出侧边栏（右侧滑入，宽度约 400px）
4. 侧边栏顶部显示用户划选的原文（灰色引用样式）
5. 侧边栏下方显示输入框，用户可以：
   - 直接发送（默认问题为「请解释这段内容」）
   - 或自定义输入追问内容
6. AI 流式返回答案，边生成边显示
7. 答案生成完毕后，底部出现「存为笔记」按钮

**AI 提问的上下文构成**：
```
系统提示：你是用户的学习助手，帮助用户深入理解他们正在学习的内容。
          结合用户的知识库内容和联网搜索，给出准确、深入的解答。
          回答使用 Markdown 格式，结构清晰。

用户消息：
[当前笔记标题]：{note_title}
[划选的原文]：{selected_text}
[当前笔记的完整正文]：{note_content}
[相关知识库笔记（RAG 检索）]：{related_notes}
[用户的追问]：{user_question}
```

---

### 3. AI 答案一键存为笔记

**存储逻辑**：
- 点击「存为笔记」后，创建一条新笔记
- 新笔记内容 = AI 的回答（Markdown 格式）
- 新笔记标题 = 自动生成（取用户追问的前 20 字，或 AI 生成摘要）
- 新笔记的「父笔记 ID」= 当前正在阅读的笔记 ID（建立知识树父子关系）
- 新笔记自动继承相关标签
- 存储完成后，在侧边栏底部提示「已存为笔记」，并提供「立即查看」跳转链接

---

### 4. # 标签系统与自动目录

**标签录入**：
- 笔记编辑器顶部有标签输入区
- 输入 `#` 触发标签联想下拉（已有标签）
- 回车或空格确认新标签
- 标签以 pill 样式展示，可删除

**自动目录**：
- 左侧边栏展示所有标签
- 点击标签，右侧笔记列表按该标签筛选
- 支持多标签交叉筛选
- 标签旁显示该标签下的笔记数量

---

### 5. 本地知识库 RAG

**实现方式**：
- 每次笔记保存后，对笔记内容做 embedding（分段，每段约 300 字）
- 存储 embedding 向量到 IndexedDB
- 用户提问时，对问题做 embedding，与知识库做余弦相似度检索
- 取 Top 3 相关笔记片段，拼入 AI 上下文

**技术选型**：
- 优先使用 `@xenova/transformers`（浏览器端本地 embedding，无需 API Key）
- 备选：调用 OpenAI `text-embedding-3-small`

---

### 6. 联网搜索能力

- **所有 AI 调用必须通过 Next.js Route Handler 代理**，不得在客户端直接调用 API（防止 Key 泄露）
- Route Handler 路径：`app/api/chat/route.ts`，使用原生 `fetch` 调用智谱 AI GLM API，`ReadableStream` 实现流式响应
- GLM 原生支持 `web_search` 工具，直接在请求体中启用，无需额外搜索服务
- 在 AI 侧边栏底部，用小图标标注哪些内容来自联网搜索
- 联网来源以角标形式展示，可点击查看原始链接

**Route Handler 示例结构**：
```ts
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages, system, enableSearch } = await req.json();

  const tools = enableSearch
    ? [{ type: "web_search" }]
    : [];

  const response = await fetch(
    "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: "glm-4",   // 可替换为 glm-4-flash（更快更便宜）
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
        tools,
      }),
    }
  );

  // 直接透传 SSE 流给客户端
  return new Response(response.body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

**模型选型建议**：
- `glm-4`：能力最强，适合复杂追问场景
- `glm-4-flash`：速度更快、成本更低，适合简单问答，MVP 阶段可优先使用
- `glm-4-long`：支持超长上下文，适合大文档 RAG 场景（阶段二文件导入后考虑）

---

### 7. 笔记父子关联关系

**数据结构**：
```js
{
  id: "uuid",
  title: "笔记标题",
  content: "Markdown 内容",
  tags: ["标签A", "标签B"],
  parentId: "父笔记uuid 或 null",
  childIds: ["子笔记uuid1", "子笔记uuid2"],
  sourceText: "触发该笔记的划选原文（如有）",
  createdAt: "ISO 时间",
  updatedAt: "ISO 时间"
}
```

---

### 8. 知识树可视化

**展示位置**：应用首页 `/`，或左侧边栏底部有「知识树」入口。

**渲染方式**：使用 `d3.js` 或 `react-flow` 绘制树形图。

**节点设计**：
- 每个节点 = 一篇笔记
- 节点显示：笔记标题（截断）+ 标签 pill
- 根节点（无父笔记）= 最大，用不同颜色标注
- 子节点连线带方向箭头，从父指向子
- 节点可点击，跳转到该笔记详情页

**交互**：
- 支持缩放和拖拽平移
- 鼠标悬停节点，浮出笔记摘要（前 100 字）
- 支持按标签高亮筛选（点击标签，树中相关节点高亮，其余变淡）

**视觉效果**：
- 树的深度越深，节点越小
- 连线粗细代表关联强度（子笔记数量）
- 用颜色区分不同标签分支

---

### 9. AI 独立聊天界面

**页面**：`/chat`

**功能**：
- 标准对话界面，支持多轮对话
- 每次对话自动携带知识库 RAG 上下文
- 支持联网搜索
- 对话历史本地存储
- 任意一条 AI 回复可「存为笔记」（触发同上面第3条的存储逻辑，但 parentId 为 null）

---

## 阶段二：完善功能（核心跑通后再做）

### 10. 文内跨笔记链接

- 编辑器中输入 `[[` 触发笔记搜索下拉
- 选择笔记后，插入内联链接，渲染为可点击的高亮文字
- 点击后，在当前页面右侧滑出目标笔记预览面板（不跳转页面）

### 11. 上传文件转笔记

- 支持上传 PDF、TXT、MD 文件
- 解析文件文本内容，自动切分为若干笔记（按章节或按固定长度）
- 切分后的笔记自动建立父子关系（文件名为根节点，各章节为子节点）
- 解析后进入知识库 RAG 索引

### 12. 图片完整支持

- 笔记内图片支持点击放大预览（lightbox）
- 图片支持添加 alt 文字描述（用于 RAG 检索）
- 图片统一存储管理（IndexedDB blob 或 objectURL）

---

## 阶段三：增强功能（可推迟）

### 13. 全文搜索

- 使用 `flexsearch` 或 `minisearch` 做本地全文检索
- 顶部搜索栏，支持按标题、内容、标签搜索
- 搜索结果高亮匹配词

### 14. 笔记导出

- 单篇笔记导出为 Markdown 文件
- 全库导出为 ZIP（包含所有 .md 文件和图片）

### 15. 学习进度统计

- 首页展示：总笔记数、本周新增、知识树深度、最活跃标签
- 每日写作热力图（类似 GitHub contributions）

---

## UI / UX 设计要求

**整体风格**：
- 简洁、克制，以内容为中心
- 左侧为导航栏（标签目录 + 知识树入口），宽度 240px，可折叠
- 中间为笔记编辑/阅读区，最大宽度 720px，居中
- 右侧为 AI 侧边栏（按需滑入），宽度 400px

**配色**：
- 主背景：白色或极浅灰（#FAFAFA）
- 编辑区背景：纯白
- 强调色：一种主色（建议靛蓝或墨绿），用于链接、按钮、高亮
- AI 侧边栏背景：略深于主背景，视觉上区分

**字体**：
- 正文：系统字体栈或 `Noto Serif SC`（中文场景）
- 代码块：`JetBrains Mono` 或 `Fira Code`

**响应式**：
- 优先保证桌面端（1280px+）体验
- 平板端（768px）：隐藏左侧栏，通过汉堡菜单触发

---

## 数据存储结构（本地）

```js
// IndexedDB: database name = "knowledge-base"

// store: notes
{
  id, title, content, tags,
  parentId, childIds,
  sourceText, // 触发该笔记的划选原文
  embedding,  // Float32Array 向量
  createdAt, updatedAt
}

// store: tags
{
  id, name, color, noteCount
}

// store: chat_sessions
{
  id, messages: [{role, content, timestamp}],
  createdAt
}
```

---

## 开发优先级建议

请按以下顺序实现，每个阶段完成后可独立运行和测试：

1. **笔记 CRUD** —— 创建、编辑、删除、列表页
2. **标签系统** —— 标签录入、目录筛选
3. **划选提问 + AI 侧边栏** —— 核心交互
4. **AI 答案存为笔记 + 父子关系**
5. **知识树可视化**
6. **本地 RAG + 联网搜索**
7. **独立 AI 聊天页**

---

---

## Vercel 部署配置

**环境变量**（在 Vercel Dashboard → Settings → Environment Variables 中设置）：
```
ZHIPU_API_KEY=xxxxxxxxxxxxxxxx
```

**`vercel.json`**（根目录，控制函数超时，AI 流式响应需要更长时间）：
```json
{
  "functions": {
    "app/api/**": {
      "maxDuration": 60
    }
  }
}
```

**`next.config.js` 注意事项**：
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // @xenova/transformers 用到 WASM，需要允许跨域隔离头
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
```

**部署流程**：
1. 代码推送到 GitHub
2. Vercel 导入该仓库，自动识别 Next.js 框架
3. 在 Vercel 控制台填入 `ZHIPU_API_KEY` 环境变量
4. 触发部署，完成

---

*以上为完整产品需求，请严格按阶段实现，优先保证核心学习循环（1-4步）的体验质量。*
