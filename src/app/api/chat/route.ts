export async function POST(req: Request) {
  const { messages, system, enableSearch } = await req.json();

  const apiKey = process.env.ZHIPU_API_KEY;

  // 无 API Key 时返回模拟响应
  if (!apiKey || apiKey === "your-key-here") {
    const mockResponse = `这是一个模拟响应。请在环境变量中配置 \`ZHIPU_API_KEY\` 以启用 AI 功能。

如果你在本地开发，请编辑 \`.env.local\` 文件：
\`\`\`
ZHIPU_API_KEY=你的智谱API密钥
\`\`\``;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunks = mockResponse.split("");
        let i = 0;
        const interval = setInterval(() => {
          if (i >= chunks.length) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            clearInterval(interval);
            return;
          }
          const chunk = JSON.stringify({
            choices: [{ delta: { content: chunks[i] } }],
          });
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          i++;
        }, 10);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // 构造请求体：GLM 原生支持 web_search 工具
  const tools = enableSearch ? [{ type: "web_search", web_search: { enable: true } }] : [];
  const systemMessage = system || "你是一个知识库学习助手，回答使用 Markdown 格式，结构清晰。";

  const body: Record<string, unknown> = {
    model: "glm-4-flash",
    stream: true,
    messages: [{ role: "system", content: systemMessage }, ...messages],
  };

  if (tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(
    "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "智谱 AI API 调用失败", status: response.status, detail: errText }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  // 透传 SSE 流给客户端
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
