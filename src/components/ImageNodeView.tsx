"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";

export function ImageNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const [showAltInput, setShowAltInput] = useState(false);
  const [altText, setAltText] = useState(node.attrs.alt || "");

  const handleAltSave = () => {
    updateAttributes({ alt: altText });
    setShowAltInput(false);
  };

  return (
    <NodeViewWrapper className="relative group my-4">
      <img
        src={node.attrs.src}
        alt={node.attrs.alt || ""}
        title={node.attrs.title || ""}
        className={`max-w-full h-auto rounded-lg cursor-pointer transition-shadow ${
          selected ? "ring-2 ring-primary shadow-lg" : ""
        }`}
        style={{ width: node.attrs.width || undefined }}
        draggable
      />

      {/* hover 时显示操作按钮 */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={() => setShowAltInput(!showAltInput)}
          className="px-2 py-1 bg-white/90 border border-border rounded text-xs text-text-secondary hover:text-primary shadow-sm"
        >
          {node.attrs.alt ? "编辑描述" : "添加描述"}
        </button>
        <button
          onClick={deleteNode}
          className="px-2 py-1 bg-white/90 border border-border rounded text-xs text-red-500 hover:bg-red-50 shadow-sm"
        >
          删除
        </button>
      </div>

      {/* alt 文字输入 */}
      {showAltInput && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAltSave()}
            placeholder="输入图片描述..."
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          <button
            onClick={handleAltSave}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg"
          >
            保存
          </button>
        </div>
      )}

      {/* 显示已有的 alt 文字 */}
      {node.attrs.alt && !showAltInput && (
        <p className="text-xs text-text-secondary mt-1 italic">{node.attrs.alt}</p>
      )}
    </NodeViewWrapper>
  );
}
