"use client";

import { useState, useEffect, useRef } from "react";
import { getAllNotes, type Note } from "@/lib/db";

interface NoteSelectorProps {
  selectedNotes: Note[];
  onChange: (notes: Note[]) => void;
}

export function NoteSelector({ selectedNotes, onChange }: NoteSelectorProps) {
  const [open, setOpen] = useState(false);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      getAllNotes().then(setAllNotes);
    }
  }, [open]);

  // 点击外部关闭
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedIds = new Set(selectedNotes.map((n) => n.id));

  const filtered = allNotes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  function stripHtml(html: string) {
    return html.replace(/<[^>]*>/g, "");
  }

  const toggle = (note: Note) => {
    if (selectedIds.has(note.id)) {
      onChange(selectedNotes.filter((n) => n.id !== note.id));
    } else {
      onChange([...selectedNotes, note]);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* 触发按钮 + 已选笔记 pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setOpen(!open)}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            selectedNotes.length > 0
              ? "bg-primary/10 text-primary"
              : "bg-border text-text-secondary hover:bg-border/80"
          }`}
        >
          {selectedNotes.length > 0
            ? `已选 ${selectedNotes.length} 篇文档`
            : "+ 关联文档"}
        </button>
        {selectedNotes.map((n) => (
          <span
            key={n.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full max-w-[150px]"
          >
            <span className="truncate">{n.title}</span>
            <button
              onClick={() => toggle(n)}
              className="hover:text-red-500 shrink-0"
            >
              x
            </button>
          </span>
        ))}
      </div>

      {/* 下拉选择面板 */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* 搜索 */}
          <div className="p-2 border-b border-border">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索笔记标题或标签..."
              className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          </div>

          {/* 笔记列表 */}
          <div className="max-h-64 overflow-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-6">
                {allNotes.length === 0 ? "暂无笔记" : "无匹配结果"}
              </p>
            ) : (
              filtered.map((note) => (
                <button
                  key={note.id}
                  onClick={() => toggle(note)}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-border/30 transition-colors border-b border-border/50 last:border-0 ${
                    selectedIds.has(note.id) ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px] ${
                        selectedIds.has(note.id)
                          ? "bg-primary border-primary text-white"
                          : "border-border"
                      }`}
                    >
                      {selectedIds.has(note.id) && "✓"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{note.title}</p>
                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        {stripHtml(note.content).slice(0, 60)}
                      </p>
                    </div>
                  </div>
                  {note.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 ml-6">
                      {note.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-border rounded-full text-text-secondary">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
