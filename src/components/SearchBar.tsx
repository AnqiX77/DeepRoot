"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { searchNotes, type SearchResult } from "@/lib/search";

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 text-text rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const res = await searchNotes(q);
    setResults(res.slice(0, 10));
    setSelectedIdx(0);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(query), 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, doSearch]);

  // 快捷键 Ctrl+K 打开
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      e.preventDefault();
      navigateTo(results[selectedIdx].id);
    }
  };

  const navigateTo = (id: string) => {
    router.push(`/notes/${id}`);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "");
  }

  function getSnippet(content: string, q: string): string {
    const plain = typeof content === "string" ? stripHtml(content) : "";
    const idx = plain.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return plain.slice(0, 80);
    const start = Math.max(0, idx - 30);
    const end = Math.min(plain.length, idx + q.length + 50);
    return (start > 0 ? "..." : "") + plain.slice(start, end) + (end < plain.length ? "..." : "");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* 触发按钮 */}
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary border border-border rounded-lg hover:border-primary/50 transition-colors bg-white"
      >
        <span>🔍</span>
        <span>搜索笔记...</span>
        <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 bg-border/60 rounded text-text-secondary ml-2">
          Ctrl+K
        </kbd>
      </button>

      {/* 搜索弹层 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30">
          <div className="w-full max-w-[560px] bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
            {/* 搜索输入 */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <span className="text-text-secondary">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索笔记标题、内容、标签..."
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-text-secondary/50"
                autoFocus
              />
              <button
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  setResults([]);
                }}
                className="text-xs text-text-secondary hover:text-text px-2 py-1 rounded bg-border/40"
              >
                ESC
              </button>
            </div>

            {/* 搜索结果 */}
            <div className="max-h-[400px] overflow-auto">
              {query.trim() && results.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-text-secondary">
                  没有找到匹配的笔记
                </div>
              )}
              {results.map((r, i) => (
                <div
                  key={r.id}
                  onClick={() => navigateTo(r.id)}
                  className={`px-4 py-3 cursor-pointer border-b border-border/50 last:border-b-0 transition-colors ${
                    i === selectedIdx ? "bg-primary/5" : "hover:bg-border/30"
                  }`}
                >
                  <div className="text-sm font-medium text-text">
                    {highlightText(r.title, query)}
                  </div>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {highlightText(getSnippet(r.content, query), query)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {r.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 底部提示 */}
            {results.length > 0 && (
              <div className="px-4 py-2 border-t border-border text-[11px] text-text-secondary flex items-center gap-4">
                <span>↑↓ 导航</span>
                <span>↵ 打开</span>
                <span>ESC 关闭</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
