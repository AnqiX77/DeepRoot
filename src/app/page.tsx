"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { getAllNotes, getAllTags, type Note, type Tag } from "@/lib/db";
import { LearningStats } from "@/components/LearningStats";

// 自定义节点
function NoteNode({ data }: { data: { label: string; tags: string[]; depth: number; childCount: number; preview: string } }) {
  const scale = Math.max(0.7, 1 - data.depth * 0.1);
  return (
    <div
      className="bg-white border border-border rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative"
      style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-border !border-0 !-top-1" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-border !border-0 !-bottom-1" />
      <p className="text-sm font-medium text-text truncate max-w-[180px]">{data.label}</p>
      {data.tags.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {data.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
      {/* 悬停预览 */}
      <div className="hidden group-hover:block absolute top-full left-0 mt-2 w-64 p-3 bg-white border border-border rounded-lg shadow-lg z-50 text-xs text-text-secondary">
        {data.preview}
      </div>
    </div>
  );
}

const nodeTypes = { noteNode: NoteNode };

export default function HomePage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    Promise.all([getAllNotes(), getAllTags()]).then(([n, t]) => {
      setNotes(n);
      setTags(t);
    });
  }, []);

  // 构建树形布局
  useEffect(() => {
    if (notes.length === 0) return;

    const filteredNotes = selectedTag
      ? notes.filter((n) => n.tags.includes(selectedTag))
      : notes;

    const noteMap = new Map(notes.map((n) => [n.id, n]));
    const roots = filteredNotes.filter((n) => !n.parentId || !noteMap.has(n.parentId));

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    function stripHtml(html: string): string {
      return html.replace(/<[^>]*>/g, "").slice(0, 100) + "...";
    }

    // 从笔记 HTML 中提取所有 [[笔记链接]] 的目标 ID
    function extractNoteLinks(html: string): string[] {
      const ids: string[] = [];
      const regex = /data-note-link="([^"]+)"/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(html)) !== null) {
        ids.push(match[1]);
      }
      return ids;
    }

    function layoutTree(note: Note, x: number, y: number, depth: number): number {
      const nodeId = note.id;
      newNodes.push({
        id: nodeId,
        type: "noteNode",
        position: { x, y },
        data: {
          label: note.title,
          tags: note.tags,
          depth,
          childCount: note.childIds.length,
          preview: stripHtml(note.content),
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      const children = note.childIds
        .map((cid) => noteMap.get(cid))
        .filter((c): c is Note => !!c && (!selectedTag || c.tags.includes(selectedTag)));

      if (children.length === 0) return 1;

      let totalWidth = 0;
      const childWidths: number[] = [];

      for (const child of children) {
        const w = layoutTree(child, x + totalWidth * 250, y + 150, depth + 1);
        childWidths.push(w);
        totalWidth += w;

        newEdges.push({
          id: `${nodeId}-${child.id}`,
          source: nodeId,
          target: child.id,
          animated: false,
          style: { stroke: "#166534", strokeWidth: Math.min(3, 1 + child.childIds.length * 0.5) },
        });
      }

      // 居中父节点
      if (children.length > 0) {
        const nodeIdx = newNodes.findIndex((n) => n.id === nodeId);
        if (nodeIdx !== -1) {
          const firstChild = newNodes.find((n) => n.id === children[0].id);
          const lastChild = newNodes.find((n) => n.id === children[children.length - 1].id);
          if (firstChild && lastChild) {
            newNodes[nodeIdx].position.x = (firstChild.position.x + lastChild.position.x) / 2;
          }
        }
      }

      return totalWidth || 1;
    }

    let xOffset = 0;
    for (const root of roots) {
      const width = layoutTree(root, xOffset * 250, 0, 0);
      xOffset += width + 1;
    }

    // 添加笔记内 [[ 链接 ]] 产生的关联边
    const existingEdgeIds = new Set(newEdges.map((e) => e.id));
    const nodeIdSet = new Set(newNodes.map((n) => n.id));

    for (const note of filteredNotes) {
      const linkedIds = extractNoteLinks(note.content);
      for (const targetId of linkedIds) {
        if (!nodeIdSet.has(targetId)) continue; // 目标不在当前可见节点中
        const edgeId = `link-${note.id}-${targetId}`;
        const reverseId = `link-${targetId}-${note.id}`;
        const parentEdgeId = `${note.id}-${targetId}`;
        // 避免与已有父子边或反向链接边重复
        if (existingEdgeIds.has(edgeId) || existingEdgeIds.has(reverseId) || existingEdgeIds.has(parentEdgeId)) continue;
        newEdges.push({
          id: edgeId,
          source: note.id,
          target: targetId,
          animated: true,
          style: { stroke: "#92400E", strokeWidth: 1.5, strokeDasharray: "6 3" },
          label: "引用",
          labelStyle: { fontSize: 10, fill: "#92400E" },
        });
        existingEdgeIds.add(edgeId);
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [notes, selectedTag, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      router.push(`/notes/${node.id}`);
    },
    [router]
  );

  return (
    <div className="h-full flex flex-col">
      {/* 学习统计 */}
      <LearningStats />

      {/* 顶部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
        <div>
          <h1 className="text-xl font-bold">知识树</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {notes.length} 篇笔记 · {tags.length} 个标签
          </p>
        </div>
        {/* 标签筛选 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              !selectedTag ? "bg-primary text-white" : "bg-border text-text-secondary hover:bg-border/80"
            }`}
          >
            全部
          </button>
          {tags.slice(0, 8).map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedTag === tag.name
                  ? "text-white"
                  : "bg-border text-text-secondary hover:bg-border/80"
              }`}
              style={selectedTag === tag.name ? { backgroundColor: tag.color } : {}}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* 知识树画布 */}
      <div className="flex-1">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <p className="text-4xl mb-4">🌱</p>
            <p className="text-lg font-medium">知识树还是空的</p>
            <p className="text-sm mt-1">创建你的第一篇笔记，开始种下知识的种子</p>
            <button
              onClick={() => router.push("/notes/new")}
              className="mt-4 px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              新建笔记
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.1}
            maxZoom={2}
          >
            <Background />
            <Controls />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
