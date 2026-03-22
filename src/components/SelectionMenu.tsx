"use client";

import { useEffect, useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";

interface SelectionMenuProps {
  editor: Editor;
  onAskAI: () => void;
  onHighlight: () => void;
}

export function SelectionMenu({ editor, onAskAI, onHighlight }: SelectionMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updateMenu = useCallback(() => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      setVisible(false);
      return;
    }

    // 获取选区的 DOM 位置
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      setVisible(false);
      return;
    }

    const range = domSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0) {
      setVisible(false);
      return;
    }

    setPosition({
      top: rect.top - 50 + window.scrollY,
      left: rect.left + rect.width / 2 - 100,
    });
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    editor.on("selectionUpdate", updateMenu);
    editor.on("blur", () => {
      // 延迟隐藏，允许点击菜单按钮
      setTimeout(() => setVisible(false), 200);
    });

    return () => {
      editor.off("selectionUpdate", updateMenu);
    };
  }, [editor, updateMenu]);

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-1 bg-white shadow-lg rounded-lg border border-border px-2 py-1"
      style={{ top: position.top, left: position.left }}
    >
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onAskAI();
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
      >
        AI 提问
      </button>
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onHighlight();
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
      >
        高亮
      </button>
    </div>
  );
}
