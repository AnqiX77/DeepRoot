"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { getAllNotes, type Note } from "@/lib/db";

interface NoteLinkSuggestionProps {
  editor: Editor;
}

export function NoteLinkSuggestion({ editor }: NoteLinkSuggestionProps) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [filtered, setFiltered] = useState<Note[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [triggerPos, setTriggerPos] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 加载所有笔记
  useEffect(() => {
    getAllNotes().then(setNotes);
  }, []);

  // 筛选
  useEffect(() => {
    if (!query) {
      setFiltered(notes.slice(0, 10));
    } else {
      const q = query.toLowerCase();
      setFiltered(
        notes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q))
        ).slice(0, 10)
      );
    }
    setSelectedIndex(0);
  }, [query, notes]);

  // 监听编辑器输入，检测 [[
  const handleUpdate = useCallback(() => {
    const { state } = editor;
    const { from } = state.selection;
    // 获取光标前的文本
    const textBefore = state.doc.textBetween(
      Math.max(0, from - 50),
      from,
      ""
    );

    const match = textBefore.match(/\[\[([^\]]*)$/);

    if (match) {
      setQuery(match[1]);
      setTriggerPos(from - match[0].length);
      setVisible(true);

      // 定位弹出框
      const coords = editor.view.coordsAtPos(from);
      setPosition({
        top: coords.bottom + 4,
        left: coords.left,
      });
    } else {
      setVisible(false);
      setTriggerPos(null);
    }
  }, [editor]);

  useEffect(() => {
    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, handleUpdate]);

  // 键盘导航
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          insertNoteLink(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        setVisible(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [visible, filtered, selectedIndex]);

  const insertNoteLink = (note: Note) => {
    if (triggerPos === null) return;

    const { state } = editor;
    const from = triggerPos;
    const to = state.selection.from;

    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContentAt(from, {
        type: "noteLink",
        attrs: { noteId: note.id, noteTitle: note.title },
      })
      .run();

    setVisible(false);
    setTriggerPos(null);
  };

  if (!visible || filtered.length === 0) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-72 bg-white border border-border rounded-xl shadow-lg overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-2 border-b border-border text-xs text-text-secondary">
        选择要链接的笔记
      </div>
      <div className="max-h-56 overflow-auto">
        {filtered.map((note, i) => (
          <button
            key={note.id}
            onMouseDown={(e) => {
              e.preventDefault();
              insertNoteLink(note);
            }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              i === selectedIndex ? "bg-primary/10 text-primary" : "hover:bg-border/30"
            }`}
          >
            <p className="font-medium truncate">{note.title}</p>
            {note.tags.length > 0 && (
              <div className="flex gap-1 mt-0.5">
                {note.tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 bg-border rounded-full text-text-secondary">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
