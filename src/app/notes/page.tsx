"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAllNotes, getAllTags, deleteNote, type Note, type Tag } from "@/lib/db";
import { FileUpload } from "@/components/FileUpload";
import { exportAllNotes } from "@/lib/export";

export default function NotesListPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-text-secondary">加载中...</div>}>
      <NotesListContent />
    </Suspense>
  );
}

type ViewMode = "list" | "tree";
type StructureFilter = "all" | "root" | "child";

function NotesListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagFilter = searchParams.get("tag");

  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(tagFilter ? [tagFilter] : []);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [structureFilter, setStructureFilter] = useState<StructureFilter>("all");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tagFilter && !selectedTags.includes(tagFilter)) {
      setSelectedTags([tagFilter]);
    }
  }, [tagFilter]);

  async function loadData() {
    const [n, t] = await Promise.all([getAllNotes(), getAllTags()]);
    setNotes(n);
    setTags(t);
  }

  // 标签筛选
  let filteredNotes =
    selectedTags.length > 0
      ? notes.filter((n) => selectedTags.every((t) => n.tags.includes(t)))
      : notes;

  // 结构筛选
  if (structureFilter === "root") {
    filteredNotes = filteredNotes.filter((n) => !n.parentId);
  } else if (structureFilter === "child") {
    filteredNotes = filteredNotes.filter((n) => !!n.parentId);
  }

  const toggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("确定删除这篇笔记？")) {
      await deleteNote(id);
      window.dispatchEvent(new Event("tags-updated"));
      loadData();
    }
  };

  const toggleNoteSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedNotes.size === filteredNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(filteredNotes.map((n) => n.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedNotes.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedNotes.size} 篇笔记？`)) return;
    for (const id of selectedNotes) {
      await deleteNote(id);
    }
    setSelectedNotes(new Set());
    setSelectMode(false);
    window.dispatchEvent(new Event("tags-updated"));
    loadData();
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedNotes(new Set());
  };

  function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "");
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // 构建树形结构数据
  const noteMap = new Map(notes.map((n) => [n.id, n]));

  // 树形视图：获取根节点（经标签筛选后）
  const treeRoots = filteredNotes.filter((n) => !n.parentId || !noteMap.has(n.parentId));

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">笔记列表</h1>
          {/* 视图切换 */}
          <div className="flex items-center bg-border/40 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === "list" ? "bg-white text-primary font-medium shadow-sm" : "text-text-secondary hover:text-text"
              }`}
            >
              列表
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === "tree" ? "bg-white text-primary font-medium shadow-sm" : "text-text-secondary hover:text-text"
              }`}
            >
              结构
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FileUpload onComplete={loadData} />
          <button
            onClick={() => exportAllNotes()}
            className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors"
          >
            导出全部
          </button>
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors"
            >
              批量选择
            </button>
          ) : (
            <button
              onClick={exitSelectMode}
              className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:border-red-400 hover:text-red-500 transition-colors"
            >
              取消选择
            </button>
          )}
          <button
            onClick={() => router.push("/notes/new")}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            + 新建笔记
          </button>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectMode && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
          <button
            onClick={handleSelectAll}
            className="text-sm text-primary hover:underline"
          >
            {selectedNotes.size === filteredNotes.length ? "取消全选" : "全选"}
          </button>
          <span className="text-sm text-text-secondary">
            已选 {selectedNotes.size} 篇
          </span>
          <span className="flex-1" />
          <button
            onClick={handleBatchDelete}
            disabled={selectedNotes.size === 0}
            className="px-4 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            删除选中 ({selectedNotes.size})
          </button>
        </div>
      )}

      {/* 筛选栏 */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {/* 结构筛选 */}
        <span className="text-sm text-text-secondary">类型：</span>
        {([["all", "全部"], ["root", "父笔记"], ["child", "子笔记"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStructureFilter(key)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              structureFilter === key
                ? "bg-primary text-white"
                : "bg-border text-text-secondary hover:bg-border/80"
            }`}
          >
            {label}
          </button>
        ))}

        {/* 分隔 */}
        {tags.length > 0 && <span className="w-px h-4 bg-border mx-1" />}

        {/* 标签筛选 */}
        {tags.length > 0 && (
          <>
            <span className="text-sm text-text-secondary">标签：</span>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.name)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedTags.includes(tag.name)
                    ? "text-white"
                    : "bg-border text-text-secondary hover:bg-border/80"
                }`}
                style={selectedTags.includes(tag.name) ? { backgroundColor: tag.color } : {}}
              >
                {tag.name} ({tag.noteCount})
              </button>
            ))}
          </>
        )}
        {(selectedTags.length > 0 || structureFilter !== "all") && (
          <button
            onClick={() => { setSelectedTags([]); setStructureFilter("all"); }}
            className="text-xs text-text-secondary hover:text-text underline"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* 内容区 */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-20 text-text-secondary">
          <p className="text-4xl mb-3">📝</p>
          <p>{selectedTags.length > 0 || structureFilter !== "all" ? "没有匹配的笔记" : "还没有笔记"}</p>
        </div>
      ) : viewMode === "list" ? (
        /* ========== 列表视图 ========== */
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              noteMap={noteMap}
              selectMode={selectMode}
              selected={selectedNotes.has(note.id)}
              onSelect={toggleNoteSelect}
              onDelete={handleDelete}
              onClick={() => router.push(`/notes/${note.id}`)}
              stripHtml={stripHtml}
              formatDate={formatDate}
            />
          ))}
        </div>
      ) : (
        /* ========== 结构视图 ========== */
        <div className="space-y-2">
          {treeRoots.length === 0 && filteredNotes.length > 0 ? (
            // 筛选子笔记时，直接平铺
            filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                noteMap={noteMap}
                selectMode={selectMode}
                selected={selectedNotes.has(note.id)}
                onSelect={toggleNoteSelect}
                onDelete={handleDelete}
                onClick={() => router.push(`/notes/${note.id}`)}
                stripHtml={stripHtml}
                formatDate={formatDate}
              />
            ))
          ) : (
            treeRoots.map((root) => (
              <TreeNode
                key={root.id}
                note={root}
                noteMap={noteMap}
                depth={0}
                router={router}
                selectMode={selectMode}
                selectedNotes={selectedNotes}
                onSelect={toggleNoteSelect}
                onDelete={handleDelete}
                stripHtml={stripHtml}
                formatDate={formatDate}
                selectedTags={selectedTags}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ========== 笔记卡片组件 ========== */
function NoteCard({
  note,
  noteMap,
  selectMode,
  selected,
  onSelect,
  onDelete,
  onClick,
  stripHtml,
  formatDate,
}: {
  note: Note;
  noteMap: Map<string, Note>;
  selectMode: boolean;
  selected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClick: () => void;
  stripHtml: (html: string) => string;
  formatDate: (iso: string) => string;
}) {
  const parentNote = note.parentId ? noteMap.get(note.parentId) : null;

  return (
    <div
      onClick={() =>
        selectMode
          ? onSelect(note.id, { stopPropagation: () => {} } as React.MouseEvent)
          : onClick()
      }
      className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all cursor-pointer group ${
        selected ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {selectMode && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(note.id, e as unknown as React.MouseEvent)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text truncate">{note.title}</h3>
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">
              {stripHtml(note.content).slice(0, 120)}
            </p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-xs text-text-secondary">{formatDate(note.updatedAt)}</span>
              <span className="text-xs text-text-secondary">
                {stripHtml(note.content).length} 字
              </span>
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {parentNote && (
                <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">
                  父: {parentNote.title}
                </span>
              )}
              {note.childIds.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">
                  {note.childIds.length} 个子笔记
                </span>
              )}
            </div>
          </div>
        </div>
        {!selectMode && (
          <button
            onClick={(e) => onDelete(note.id, e)}
            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 transition-all p-1 text-sm"
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}

/* ========== 树形节点递归组件 ========== */
function TreeNode({
  note,
  noteMap,
  depth,
  router,
  selectMode,
  selectedNotes,
  onSelect,
  onDelete,
  stripHtml,
  formatDate,
  selectedTags,
}: {
  note: Note;
  noteMap: Map<string, Note>;
  depth: number;
  router: ReturnType<typeof useRouter>;
  selectMode: boolean;
  selectedNotes: Set<string>;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  stripHtml: (html: string) => string;
  formatDate: (iso: string) => string;
  selectedTags: string[];
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  const children = note.childIds
    .map((id) => noteMap.get(id))
    .filter((c): c is Note => {
      if (!c) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => c.tags.includes(t))) return false;
      return true;
    });

  const hasChildren = children.length > 0;

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      {/* 节点行 */}
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-lg border bg-white hover:shadow-sm transition-all cursor-pointer group ${
          selectedNotes.has(note.id) ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        {/* 展开/折叠按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className={`w-5 h-5 flex items-center justify-center text-xs rounded transition-colors shrink-0 ${
            hasChildren
              ? "text-text-secondary hover:bg-border/60"
              : "text-transparent cursor-default"
          }`}
        >
          {hasChildren ? (expanded ? "▼" : "▶") : "·"}
        </button>

        {/* 复选框 */}
        {selectMode && (
          <input
            type="checkbox"
            checked={selectedNotes.has(note.id)}
            onChange={(e) => onSelect(note.id, e as unknown as React.MouseEvent)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
          />
        )}

        {/* 深度线 */}
        {depth > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary/30 shrink-0" />
        )}

        {/* 笔记信息 */}
        <div
          className="flex-1 min-w-0"
          onClick={() =>
            selectMode
              ? onSelect(note.id, { stopPropagation: () => {} } as React.MouseEvent)
              : router.push(`/notes/${note.id}`)
          }
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text truncate">{note.title}</span>
            {hasChildren && (
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full shrink-0">
                {children.length} 子
              </span>
            )}
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full shrink-0"
              >
                #{tag}
              </span>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-0.5 truncate">
            {stripHtml(note.content).slice(0, 80)}
          </p>
        </div>

        {/* 时间 & 删除 */}
        <span className="text-[11px] text-text-secondary shrink-0">{formatDate(note.updatedAt)}</span>
        {!selectMode && (
          <button
            onClick={(e) => onDelete(note.id, e)}
            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 transition-all p-1 text-xs shrink-0"
          >
            删除
          </button>
        )}
      </div>

      {/* 子节点 */}
      {expanded && hasChildren && (
        <div className="mt-1 space-y-1 border-l-2 border-border/50 ml-2.5">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              note={child}
              noteMap={noteMap}
              depth={depth + 1}
              router={router}
              selectMode={selectMode}
              selectedNotes={selectedNotes}
              onSelect={onSelect}
              onDelete={onDelete}
              stripHtml={stripHtml}
              formatDate={formatDate}
              selectedTags={selectedTags}
            />
          ))}
        </div>
      )}
    </div>
  );
}
