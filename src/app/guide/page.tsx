"use client";

export default function GuidePage() {
  return (
    <div className="max-w-[760px] mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">DeepRoot 使用说明</h1>
      <p className="text-text-secondary mb-6">
        欢迎使用 DeepRoot —— 一个以递归式深度学习为核心的个人知识管理工具。
      </p>

      {/* 核心理念 */}
      <div className="mb-10 px-5 py-5 bg-primary/5 border border-primary/20 rounded-xl">
        <h2 className="text-base font-bold text-primary mb-2">核心理念</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          从一个实际问题开始，学习需要解决这个问题的所有东西，发现更多子问题，
          再搞定那些东西，一路递归到问题的核心。
        </p>
        <p className="text-sm text-text-secondary leading-relaxed mt-2">
          在 DeepRoot 中，你阅读笔记时可以随时划选内容向 AI 追问，AI 的答案一键存为子笔记，
          子笔记中又可以继续追问 —— 形成一棵不断生长的「学习树」，每一次追问都让你离问题的本质更近一步。
        </p>
      </div>

      {/* 目录 */}
      <nav className="mb-10 p-5 bg-bg rounded-xl border border-border">
        <h2 className="text-sm font-semibold text-text-secondary mb-3">目录</h2>
        <ol className="space-y-1.5 text-sm list-decimal list-inside">
          <li><a href="#notes" className="text-primary hover:underline">笔记编辑器</a></li>
          <li><a href="#ai-ask" className="text-primary hover:underline">划选文字向 AI 提问</a></li>
          <li><a href="#ai-save" className="text-primary hover:underline">AI 答案存为笔记</a></li>
          <li><a href="#tags" className="text-primary hover:underline">标签系统</a></li>
          <li><a href="#tree" className="text-primary hover:underline">知识树可视化</a></li>
          <li><a href="#chat" className="text-primary hover:underline">AI 独立对话</a></li>
          <li><a href="#search" className="text-primary hover:underline">全文搜索</a></li>
          <li><a href="#notelink" className="text-primary hover:underline">跨笔记链接</a></li>
          <li><a href="#upload" className="text-primary hover:underline">上传文件转笔记</a></li>
          <li><a href="#image" className="text-primary hover:underline">图片支持</a></li>
          <li><a href="#export" className="text-primary hover:underline">笔记导出</a></li>
          <li><a href="#stats" className="text-primary hover:underline">学习进度统计</a></li>
          <li><a href="#views" className="text-primary hover:underline">列表与结构视图</a></li>
          <li><a href="#batch" className="text-primary hover:underline">批量管理</a></li>
          <li><a href="#shortcuts" className="text-primary hover:underline">快捷键</a></li>
        </ol>
      </nav>

      {/* 正文 */}
      <div className="space-y-12">

        {/* 1. 笔记编辑器 */}
        <Section id="notes" title="1. 笔记编辑器" icon="📝">
          <P>
            笔记编辑器是 DeepRoot 的基础，采用所见即所得（WYSIWYG）的编辑方式，风格类似 Notion。
          </P>
          <SubTitle>支持的格式</SubTitle>
          <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary ml-2">
            <li>标题（H1 / H2 / H3）</li>
            <li>粗体、斜体、行内代码</li>
            <li>无序列表、有序列表</li>
            <li>代码块（支持语法高亮）</li>
            <li>引用块（blockquote）</li>
            <li>分割线</li>
            <li>图片（粘贴 / 拖拽 / 按钮上传）</li>
          </ul>
          <SubTitle>如何操作</SubTitle>
          <Steps steps={[
            "点击左侧「+ 新建笔记」按钮，或在笔记列表页点击「+ 新建笔记」",
            "在顶部输入笔记标题",
            "在编辑区域使用工具栏按钮或直接书写内容",
            "编辑器会在你停止输入 1 秒后自动保存，顶部会显示「已保存」提示",
          ]} />
          <Tip>编辑器顶部会显示字数统计。标题区域下方可以添加标签。</Tip>
        </Section>

        {/* 2. 划选提问 */}
        <Section id="ai-ask" title="2. 划选文字向 AI 提问" icon="💡">
          <P>
            这是 DeepRoot 最核心的交互 —— 在阅读笔记时，你可以随时选中一段文字向 AI 追问，
            深入理解你正在学习的内容，递归地挖掘问题的本质。
          </P>
          <SubTitle>操作步骤</SubTitle>
          <Steps steps={[
            "在笔记编辑器中，用鼠标选中你想追问的文字",
            "松开鼠标后，选区附近会浮出一个小工具条",
            "点击工具条上的「向 AI 提问」按钮",
            "右侧会滑出 AI 侧边栏，顶部显示你选中的原文",
            "在输入框中输入你的问题（或直接发送，默认问题为「请解释这段内容」）",
            "AI 会以流式方式生成回答",
          ]} />
          <Tip>
            AI 回答时会自动参考当前笔记的完整内容、知识库中的相关笔记（RAG 检索），并支持联网搜索获取最新信息。
          </Tip>
        </Section>

        {/* 3. 存为笔记 */}
        <Section id="ai-save" title="3. AI 答案存为笔记" icon="💾">
          <P>
            AI 的每一条回复都可以一键保存为新笔记，新笔记会自动成为当前笔记的「子笔记」，
            形成一棵不断生长的学习树 —— 这正是 DeepRoot「递归深入」的核心体验。
          </P>
          <SubTitle>操作步骤</SubTitle>
          <Steps steps={[
            "在 AI 侧边栏中，找到你想保存的回复",
            "点击该回复下方的「存为笔记」按钮",
            "系统会自动创建新笔记，标题取自你的提问前 20 个字",
            "新笔记的父笔记会自动设为当前正在阅读的笔记",
            "保存后会提示「已存为笔记」，点击可跳转查看",
          ]} />
          <Tip>
            在 AI 对话页面（/chat）中保存的笔记没有父笔记，会作为独立的根节点出现在知识树中。
          </Tip>
        </Section>

        {/* 4. 标签系统 */}
        <Section id="tags" title="4. 标签系统" icon="🏷️">
          <P>
            标签帮助你对笔记进行分类组织。每篇笔记可以有多个标签。
          </P>
          <SubTitle>添加标签</SubTitle>
          <Steps steps={[
            "在笔记编辑器的标题下方，找到标签输入区",
            "输入标签名称，按回车确认",
            "输入时会自动联想已有标签，可用上下键选择",
            "标签以彩色 pill 样式显示，点击 × 可删除",
          ]} />
          <SubTitle>按标签筛选</SubTitle>
          <Steps steps={[
            "左侧边栏底部显示所有标签及对应笔记数量",
            "点击标签可快速跳转到该标签下的笔记列表",
            "在笔记列表页和知识树页面，顶部也可以按标签筛选",
            "支持多标签交叉筛选（同时选多个标签）",
          ]} />
        </Section>

        {/* 5. 知识树 */}
        <Section id="tree" title="5. 知识树可视化" icon="🌳">
          <P>
            首页展示你所有笔记构成的知识树。每个节点是一篇笔记，
            深绿色连线表示父子关系（划选提问生成的子笔记），棕色虚线表示笔记间的引用链接。
          </P>
          <SubTitle>交互方式</SubTitle>
          <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary ml-2">
            <li>滚轮缩放，拖拽平移画布</li>
            <li>鼠标悬停节点可查看笔记摘要（前 100 字）</li>
            <li>点击节点跳转到对应笔记详情页</li>
            <li>顶部标签按钮可以高亮筛选特定标签的分支</li>
          </ul>
          <SubTitle>两种连线</SubTitle>
          <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary ml-2">
            <li><strong>深绿色实线</strong>：父子关系（AI 追问产生的子笔记）</li>
            <li><strong>棕色虚线</strong>：引用关系（笔记中通过 [[ 链接的笔记）</li>
          </ul>
          <Tip>
            树的深度越深，节点越小；连线粗细反映子笔记数量。首页上方还有学习统计卡片。
          </Tip>
        </Section>

        {/* 6. AI 对话 */}
        <Section id="chat" title="6. AI 独立对话" icon="💬">
          <P>
            除了笔记内的划选提问，你还可以在独立的 AI 对话页面进行多轮对话。
          </P>
          <SubTitle>操作步骤</SubTitle>
          <Steps steps={[
            "点击左侧导航「AI 对话」进入",
            "左侧面板可以新建/切换对话会话",
            "在对话页面上方，可以点击「选择知识库文档」按钮",
            "选中的文档全文会作为上下文注入 AI，AI 会基于文档内容回答",
            "每条 AI 回复旁都有「存为笔记」按钮",
          ]} />
          <Tip>
            支持联网搜索 —— AI 会使用智谱 GLM 原生的 web_search 工具获取实时信息。
          </Tip>
        </Section>

        {/* 7. 全文搜索 */}
        <Section id="search" title="7. 全文搜索" icon="🔍">
          <P>
            支持对所有笔记进行快速全文检索，可搜索标题、正文内容和标签。
          </P>
          <SubTitle>操作方式</SubTitle>
          <Steps steps={[
            "点击左侧边栏的「搜索笔记...」按钮，或使用快捷键 Ctrl+K",
            "在弹出的搜索框中输入关键词",
            "搜索结果实时显示，匹配词会高亮标注",
            "用上下方向键选择结果，按回车跳转到对应笔记",
            "按 ESC 关闭搜索",
          ]} />
          <Tip>
            搜索支持模糊匹配和前缀匹配，输入部分关键词也能找到结果。中文按单字分词，搜索单个字也有效。
          </Tip>
        </Section>

        {/* 8. 跨笔记链接 */}
        <Section id="notelink" title="8. 跨笔记链接" icon="🔗">
          <P>
            在笔记中可以插入指向其他笔记的链接，构建笔记之间的知识网络。
            链接关系也会在知识树中以棕色虚线显示。
          </P>
          <SubTitle>操作步骤</SubTitle>
          <Steps steps={[
            "在编辑器中输入 [[ 两个左方括号",
            "弹出笔记搜索下拉框，输入关键词筛选",
            "选择目标笔记，链接会以高亮文字形式插入",
            "点击链接，右侧会滑出目标笔记的预览面板（不离开当前页）",
            "在预览面板中可以点击「前往」跳转到目标笔记",
          ]} />
        </Section>

        {/* 9. 上传文件 */}
        <Section id="upload" title="9. 上传文件转笔记" icon="📁">
          <P>
            支持将外部文件快速导入为笔记，目前支持 PDF、TXT、Markdown 三种格式。
          </P>
          <SubTitle>操作步骤</SubTitle>
          <Steps steps={[
            "在笔记列表页，点击「上传文件（PDF / TXT / MD）」按钮",
            "选择文件（支持一次选择多个）",
            "系统会自动解析文件内容并创建笔记",
            "笔记标题为文件名，内容为解析后的正文",
            "导入的笔记会自动添加「导入」标签",
          ]} />
          <Tip>
            PDF 文件会自动提取文字内容。Markdown 文件会转换为富文本格式显示。
          </Tip>
        </Section>

        {/* 10. 图片 */}
        <Section id="image" title="10. 图片支持" icon="🖼️">
          <P>
            笔记编辑器全面支持图片的插入和管理。
          </P>
          <SubTitle>插入图片的三种方式</SubTitle>
          <ul className="list-decimal list-inside space-y-1 text-sm text-text-secondary ml-2">
            <li><strong>工具栏按钮</strong>：点击编辑器工具栏的「插入图片」按钮，选择本地图片</li>
            <li><strong>粘贴</strong>：直接从剪贴板粘贴图片（截图后 Ctrl+V）</li>
            <li><strong>拖拽</strong>：将图片文件拖入编辑器区域</li>
          </ul>
          <SubTitle>图片操作</SubTitle>
          <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary ml-2">
            <li>鼠标悬停图片，右上角出现操作按钮</li>
            <li>点击「添加描述」可为图片添加说明文字（alt 文本）</li>
            <li>点击「删除」移除图片</li>
            <li>点击图片可打开灯箱放大预览</li>
          </ul>
        </Section>

        {/* 11. 导出 */}
        <Section id="export" title="11. 笔记导出" icon="📤">
          <P>
            支持将笔记导出为 Markdown 文件，方便备份和分享。
          </P>
          <SubTitle>单篇导出</SubTitle>
          <Steps steps={[
            "进入笔记详情页",
            "点击顶部面包屑右侧的「导出 Markdown」按钮",
            "浏览器会自动下载一个 .md 文件",
          ]} />
          <SubTitle>全库导出</SubTitle>
          <Steps steps={[
            "进入笔记列表页",
            "点击顶部的「导出全部」按钮",
            "浏览器会下载一个 ZIP 压缩包，包含所有笔记的 .md 文件和图片",
          ]} />
          <Tip>
            导出的 Markdown 文件包含 frontmatter 元数据（标题、标签、创建时间等），可被其他工具读取。
          </Tip>
        </Section>

        {/* 12. 统计 */}
        <Section id="stats" title="12. 学习进度统计" icon="📊">
          <P>
            首页（知识树页面）顶部展示你的学习统计数据。
          </P>
          <SubTitle>统计指标</SubTitle>
          <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary ml-2">
            <li><strong>总笔记数</strong>：知识库中的笔记总量</li>
            <li><strong>本周新增</strong>：近 7 天内创建的笔记数</li>
            <li><strong>知识树深度</strong>：笔记父子链的最大层级</li>
            <li><strong>最活跃标签</strong>：笔记数量最多的标签</li>
          </ul>
          <SubTitle>写作热力图</SubTitle>
          <P>
            点击「展开热力图」可以查看近 20 周的每日写作活跃度，
            颜色越深表示当天的笔记活动越多，类似 GitHub 的贡献图。
          </P>
        </Section>

        {/* 13. 列表与结构视图 */}
        <Section id="views" title="13. 列表与结构视图" icon="📂">
          <P>
            笔记列表页提供两种视图模式，帮助你从不同角度管理笔记。
          </P>
          <SubTitle>列表视图</SubTitle>
          <P>
            默认视图，按更新时间倒序展示所有笔记卡片。每张卡片显示标题、内容摘要、
            标签、字数、时间，以及父笔记来源和子笔记数量。
          </P>
          <SubTitle>结构视图</SubTitle>
          <P>
            以缩进树形目录展示笔记的父子层级关系，直观呈现知识的递归结构。
          </P>
          <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary ml-2">
            <li>有子笔记的节点左侧有 ▶/▼ 展开/折叠按钮</li>
            <li>默认展开前两层，深层可手动展开</li>
            <li>左侧竖线连接子节点，层级一目了然</li>
          </ul>
          <SubTitle>切换方式</SubTitle>
          <Steps steps={[
            "在笔记列表页标题旁找到「列表 / 结构」切换按钮",
            "点击即可切换视图",
          ]} />
          <SubTitle>结构筛选</SubTitle>
          <P>
            筛选栏提供「全部 / 父笔记 / 子笔记」三个按钮，可以只看根笔记或只看子笔记，
            也可以和标签筛选组合使用。
          </P>
        </Section>

        {/* 14. 批量管理 */}
        <Section id="batch" title="14. 批量管理" icon="✅">
          <P>
            在笔记列表页支持批量选中并删除笔记。
          </P>
          <SubTitle>操作步骤</SubTitle>
          <Steps steps={[
            "在笔记列表页，点击「批量选择」按钮进入选择模式",
            "点击笔记卡片或左侧复选框来选中/取消选中",
            "点击操作栏的「全选」可一键选中所有笔记",
            "确认后点击「删除选中」按钮批量删除",
            "点击「取消选择」退出选择模式",
          ]} />
          <Tip>
            批量选择在列表视图和结构视图中均可使用。
          </Tip>
        </Section>

        {/* 15. 快捷键 */}
        <Section id="shortcuts" title="15. 快捷键" icon="⌨️">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-secondary font-medium">快捷键</th>
                  <th className="text-left py-2 text-text-secondary font-medium">功能</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <KbdRow keys="Ctrl + K" desc="打开全文搜索" />
                <KbdRow keys="Ctrl + B" desc="加粗" />
                <KbdRow keys="Ctrl + I" desc="斜体" />
                <KbdRow keys="Ctrl + E" desc="行内代码" />
                <KbdRow keys="Ctrl + Shift + 1/2/3" desc="切换标题级别" />
                <KbdRow keys="Ctrl + Shift + 8" desc="无序列表" />
                <KbdRow keys="Ctrl + Shift + 9" desc="有序列表" />
                <KbdRow keys="[[" desc="插入笔记链接" />
                <KbdRow keys="ESC" desc="关闭搜索/弹层" />
              </tbody>
            </table>
          </div>
        </Section>

      </div>

      {/* 底部 */}
      <div className="mt-16 pt-8 border-t border-border text-center text-sm text-text-secondary">
        <p>DeepRoot —— 从问题出发，递归到知识的根部</p>
      </div>
    </div>
  );
}

/* ---------- 复用的小组件 ---------- */

function Section({ id, title, icon, children }: { id: string; title: string; icon: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
        <span>{icon}</span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-text mt-4 mb-2">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-text-secondary leading-relaxed">{children}</p>;
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2 ml-2">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
          <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-0.5">
            {i + 1}
          </span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 px-4 py-3 bg-primary/5 border border-primary/15 rounded-lg text-sm text-text-secondary">
      <span className="font-medium text-primary mr-1">提示：</span>
      {children}
    </div>
  );
}

function KbdRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4">
        <kbd className="px-2 py-0.5 bg-border/50 rounded text-xs font-mono">{keys}</kbd>
      </td>
      <td className="py-2">{desc}</td>
    </tr>
  );
}
