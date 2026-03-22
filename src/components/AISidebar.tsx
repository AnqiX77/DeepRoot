"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAISidebar } from "./AISidebarContext";
import { createNote } from "@/lib/db";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AISidebar() {
  const { selectedText, noteId, noteTitle, noteContent, closeSidebar } = useAISidebar();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set());
  const [savedNoteIds, setSavedNoteIds] = useState<Map<number, string>>(new Map());
  const [enableSearch, setEnableSearch] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 切换划选内容时重置对话
  useEffect(() => {
    setMessages([]);
    setStreamingContent("");
    setSavedSet(new Set());
    setSavedNoteIds(new Map());
  }, [selectedText]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleAsk = async () => {
    const q = question.trim() || "请解释这段内容";
    const userMsg: Message = { role: "user", content: q };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setQuestion("");
    setLoading(true);
    setStreamingContent("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          system: `你是用户的学习助手，帮助用户深入理解他们正在学习的内容。
结合用户的知识库内容和联网搜索，给出准确、深入的解答。
回答使用 Markdown 格式，结构清晰。

[当前笔记标题]：${noteTitle}
[划选的原文]：${selectedText}
[当前笔记的完整正文]：${noteContent}`,
          enableSearch,
        }),
      });

      if (!res.ok) throw new Error("请求失败");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullAnswer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullAnswer += delta;
                  setStreamingContent(fullAnswer);
                }
              } catch {
                // skip
              }
            }
          }
        }
      }

      const assistantMsg: Message = { role: "assistant", content: fullAnswer };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent("");
    } catch (err) {
      const errMsg: Message = {
        role: "assistant",
        content: "请求出错，请检查 API 配置。" + (err instanceof Error ? err.message : ""),
      };
      setMessages((prev) => [...prev, errMsg]);
      setStreamingContent("");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsNote = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg || msg.role !== "assistant") return;

    // 找前一条用户消息作为标题来源
    const prevUserMsg = messages.slice(0, msgIndex).reverse().find((m) => m.role === "user");
    const title = prevUserMsg
      ? prevUserMsg.content.slice(0, 20) + (prevUserMsg.content.length > 20 ? "..." : "")
      : selectedText.slice(0, 20) + "...";

    const note = await createNote({
      title,
      content: `<p>${msg.content.replace(/\n/g, "</p><p>")}</p>`,
      parentId: noteId,
      sourceText: selectedText,
      tags: [],
    });

    window.dispatchEvent(new Event("tags-updated"));
    setSavedSet((prev) => new Set([...prev, msgIndex]));
    setSavedNoteIds((prev) => new Map([...prev, [msgIndex, note.id]]));
  };

  return (
    <div className="w-[400px] h-screen bg-ai-bg border-l border-border flex flex-col shrink-0">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold text-sm">AI 助手</h2>
        <button onClick={closeSidebar} className="text-text-secondary hover:text-text p-1">
          ✕
        </button>
      </div>

      {/* 划选原文 */}
      <div className="px-4 py-3 bg-border/30 border-b border-border">
        <p className="text-xs text-text-secondary mb-1">划选内容：</p>
        <blockquote className="text-sm text-text-secondary border-l-2 border-primary pl-3 italic line-clamp-4">
          {selectedText}
        </blockquote>
      </div>

      {/* 对话区 */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <p className="text-sm text-text-secondary text-center mt-10">
            输入问题或直接发送，AI 将为你解答
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="bg-primary text-white rounded-2xl px-3 py-2 text-sm max-w-[85%]">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-white border border-border rounded-2xl px-3 py-2 max-w-[95%]">
                  <div className="prose prose-sm max-w-none">
                    <MarkdownRenderer content={msg.content} />
                  </div>
                </div>
                {/* 存为笔记按钮 */}
                <div className="mt-1.5 ml-1">
                  {savedSet.has(i) ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-600">已存为笔记</span>
                      {savedNoteIds.get(i) && (
                        <button
                          onClick={() => router.push(`/notes/${savedNoteIds.get(i)}`)}
                          className="text-primary hover:underline"
                        >
                          查看
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSaveAsNote(i)}
                      className="text-xs text-primary hover:underline"
                    >
                      存为笔记
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 流式输出中 */}
        {streamingContent && (
          <div>
            <div className="bg-white border border-border rounded-2xl px-3 py-2 max-w-[95%]">
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={streamingContent} />
              </div>
            </div>
          </div>
        )}

        {loading && !streamingContent && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="animate-pulse">●</span> 正在思考...
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={enableSearch}
              onChange={(e) => setEnableSearch(e.target.checked)}
              className="rounded"
            />
            联网搜索
          </label>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleAsk()}
            placeholder="输入追问内容（默认：请解释这段内容）"
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleAsk}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
