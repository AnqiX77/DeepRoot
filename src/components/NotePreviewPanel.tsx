"use client";

import { useState, useEffect } from "react";
import { getNote, type Note } from "@/lib/db";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface NotePreviewPanelProps {
  noteId: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "");
}

export function NotePreviewPanel({ noteId, onClose, onNavigate }: NotePreviewPanelProps) {
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    getNote(noteId).then((n) => setNote(n || null));
  }, [noteId]);

  if (!note) {
    return (
      <div className="w-[380px] h-screen bg-white border-l border-border flex items-center justify-center shrink-0">
        <span className="text-sm text-text-secondary">加载中...</span>
      </div>
    );
  }

  // 将 HTML 内容转回 markdown-ish 文本来渲染
  const plainContent = stripHtml(note.content);

  return (
    <div className="w-[380px] h-screen bg-white border-l border-border flex flex-col shrink-0 shadow-lg">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm truncate flex-1">{note.title}</h3>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={() => onNavigate(note.id)}
            className="text-xs text-primary hover:underline"
          >
            打开
          </button>
          <button onClick={onClose} className="text-text-secondary hover:text-text p-1">
            ✕
          </button>
        </div>
      </div>

      {/* 标签 */}
      {note.tags.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border flex-wrap">
          {note.tags.map((t) => (
            <span key={t} className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* 内容预览 */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="prose prose-sm max-w-none">
          <MarkdownRenderer content={plainContent} />
        </div>
      </div>

      {/* 元信息 */}
      <div className="px-4 py-2 border-t border-border text-xs text-text-secondary flex items-center gap-3">
        <span>{plainContent.length} 字</span>
        <span>{new Date(note.updatedAt).toLocaleDateString("zh-CN")}</span>
        {note.childIds.length > 0 && <span>{note.childIds.length} 篇子笔记</span>}
      </div>
    </div>
  );
}
