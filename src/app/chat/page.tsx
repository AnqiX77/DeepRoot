"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createChatSession,
  getChatSession,
  getAllChatSessions,
  updateChatSession,
  deleteChatSession,
  createNote,
  type ChatSession,
  type ChatMessage,
  type Note,
} from "@/lib/db";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { NoteSelector } from "@/components/NoteSelector";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "");
}

export default function ChatPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [enableSearch, setEnableSearch] = useState(true);
  const [savedMessages, setSavedMessages] = useState<Set<number>>(new Set());
  const [selectedNotes, setSelectedNotes] = useState<Note[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, streamingContent]);

  async function loadSessions() {
    const s = await getAllChatSessions();
    setSessions(s);
  }

  async function handleNewSession() {
    const session = await createChatSession();
    await loadSessions();
    setCurrentSession(session);
    setSavedMessages(new Set());
    setSelectedNotes([]);
  }

  async function handleSelectSession(id: string) {
    const session = await getChatSession(id);
    if (session) {
      setCurrentSession(session);
      setSavedMessages(new Set());
    }
  }

  async function handleDeleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteChatSession(id);
    if (currentSession?.id === id) setCurrentSession(null);
    loadSessions();
  }

  // 构建关联文档的上下文——注入完整文档内容
  function buildNoteContext(): string {
    if (selectedNotes.length === 0) return "";
    const parts = selectedNotes.map((n, i) => {
      const text = stripHtml(n.content);
      const tags = n.tags.length > 0 ? `（标签：${n.tags.join("、")}）` : "";
      return `---\n文档${i + 1}标题：${n.title}${tags}\n文档${i + 1}全文内容：\n${text}\n---`;
    });
    return `\n\n以下是用户从知识库中选择的文档，这些是文档的完整原文内容，请基于这些内容回答用户的问题：\n\n${parts.join("\n\n")}`;
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    if (!currentSession) {
      await handleNewSession();
    }

    const session = currentSession || (await createChatSession());
    if (!currentSession) {
      setCurrentSession(session);
      await loadSessions();
    }

    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...session.messages, userMsg];
    const title = session.messages.length === 0 ? input.trim().slice(0, 20) : session.title;
    await updateChatSession(session.id, { messages: updatedMessages, title });
    setCurrentSession({ ...session, messages: updatedMessages, title });
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      const noteContext = buildNoteContext();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          system: `你是用户的学习助手，帮助用户深入理解他们正在学习的内容。
结合用户的知识库内容和联网搜索，给出准确、深入的解答。
回答使用 Markdown 格式，结构清晰。${noteContext}`,
          enableSearch,
        }),
      });

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

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: fullAnswer,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      await updateChatSession(session.id, { messages: finalMessages });
      setCurrentSession((s) => (s ? { ...s, messages: finalMessages } : null));
      setStreamingContent("");
    } catch {
      setStreamingContent("请求出错，请检查 API 配置。");
    } finally {
      setLoading(false);
      loadSessions();
    }
  }

  async function handleSaveAsNote(msgIndex: number) {
    const msg = currentSession?.messages[msgIndex];
    if (!msg || msg.role !== "assistant") return;

    const prevUserMsg = currentSession?.messages[msgIndex - 1];
    const title = prevUserMsg
      ? prevUserMsg.content.slice(0, 20) + (prevUserMsg.content.length > 20 ? "..." : "")
      : "AI 对话笔记";

    await createNote({
      title,
      content: `<p>${msg.content.replace(/\n/g, "</p><p>")}</p>`,
      parentId: null,
      sourceText: prevUserMsg?.content || "",
    });

    setSavedMessages((prev) => new Set([...prev, msgIndex]));
    window.dispatchEvent(new Event("tags-updated"));
  }

  return (
    <div className="h-full flex">
      {/* 会话列表 */}
      <div className="w-64 bg-sidebar-bg border-r border-border flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <button
            onClick={handleNewSession}
            className="w-full px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            + 新对话
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => handleSelectSession(s.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer group transition-colors ${
                currentSession?.id === s.id
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:bg-border/50"
              }`}
            >
              <span className="truncate">{s.title}</span>
              <button
                onClick={(e) => handleDeleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 text-xs hover:text-red-500"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 对话区 */}
      <div className="flex-1 flex flex-col">
        {!currentSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
            <p className="text-4xl mb-4">💬</p>
            <p className="text-lg font-medium">开始一段新对话</p>
            <p className="text-sm mt-1">AI 助手会结合你的知识库和联网搜索来回答</p>
          </div>
        ) : (
          <>
            {/* 关联文档提示栏 */}
            {selectedNotes.length > 0 && (
              <div className="px-6 py-2 border-b border-border bg-primary/5 text-xs text-primary">
                AI 将参考 {selectedNotes.length} 篇关联文档进行回答
              </div>
            )}

            {/* 消息列表 */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="max-w-[720px] mx-auto space-y-6">
                {currentSession.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-white"
                          : "bg-white border border-border"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                      {msg.role === "assistant" && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          {savedMessages.has(i) ? (
                            <span className="text-xs text-green-600">已存为笔记</span>
                          ) : (
                            <button
                              onClick={() => handleSaveAsNote(i)}
                              className="text-xs text-primary hover:underline"
                            >
                              存为笔记
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* 流式输出 */}
                {streamingContent && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white border border-border">
                      <div className="prose prose-sm max-w-none">
                        <MarkdownRenderer content={streamingContent} />
                      </div>
                    </div>
                  </div>
                )}
                {loading && !streamingContent && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-3 bg-white border border-border text-sm text-text-secondary">
                      <span className="animate-pulse">正在思考...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 输入区 */}
            <div className="border-t border-border px-6 py-4 bg-white">
              <div className="max-w-[720px] mx-auto">
                <div className="flex items-center gap-3 mb-2">
                  <NoteSelector selectedNotes={selectedNotes} onChange={setSelectedNotes} />
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
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="输入你的问题..."
                    className="flex-1 px-4 py-3 border border-border rounded-xl text-sm bg-bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
