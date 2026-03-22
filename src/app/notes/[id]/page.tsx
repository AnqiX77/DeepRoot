"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getNote, createNote, updateNote, type Note } from "@/lib/db";
import { invalidateSearchIndex } from "@/lib/search";
import { exportSingleNote } from "@/lib/export";
import { NoteEditor } from "@/components/NoteEditor";
import { NotePreviewPanel } from "@/components/NotePreviewPanel";

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;
  const isNew = noteId === "new";

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewNoteId, setPreviewNoteId] = useState<string | null>(null);
  const creatingRef = useRef(false);

  useEffect(() => {
    if (isNew) {
      if (creatingRef.current) return;
      creatingRef.current = true;

      createNote().then((n) => {
        setNote(n);
        setLoading(false);
        router.replace(`/notes/${n.id}`);
      });
    } else {
      getNote(noteId).then((n) => {
        if (n) {
          setNote(n);
        } else {
          router.push("/notes");
        }
        setLoading(false);
      });
    }
  }, [noteId, isNew, router]);

  const handleSave = useCallback(
    async (content: string, tags: string[], title: string) => {
      if (!note) return;

      const finalTitle = title.trim() || "无标题笔记";
      await updateNote(note.id, { content, tags, title: finalTitle });
      setNote((prev) => (prev ? { ...prev, content, tags, title: finalTitle } : null));
      invalidateSearchIndex();

      window.dispatchEvent(new Event("tags-updated"));
    },
    [note]
  );

  const handleNoteLinkClick = useCallback((id: string) => {
    setPreviewNoteId(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        加载中...
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="h-full flex bg-white">
      {/* 主编辑区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 面包屑 */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border text-sm">
          <button
            onClick={() => router.push("/notes")}
            className="text-text-secondary hover:text-primary transition-colors"
          >
            笔记列表
          </button>
          <span className="text-text-secondary">/</span>
          <span className="text-text font-medium truncate max-w-[300px]">{note.title}</span>
          {note.parentId && (
            <>
              <span className="text-text-secondary ml-2">·</span>
              <button
                onClick={() => router.push(`/notes/${note.parentId}`)}
                className="text-primary hover:underline text-xs"
              >
                查看父笔记
              </button>
            </>
          )}
          <span className="flex-1" />
          <button
            onClick={() => exportSingleNote(note)}
            className="text-xs text-text-secondary hover:text-primary transition-colors px-2 py-1 rounded hover:bg-border/50"
          >
            导出 Markdown
          </button>
        </div>

        {/* 编辑器 */}
        <div className="flex-1 overflow-hidden">
          <NoteEditor
            noteId={note.id}
            initialContent={note.content}
            initialTags={note.tags}
            noteTitle={note.title}
            onSave={handleSave}
            onNoteLinkClick={handleNoteLinkClick}
          />
        </div>

        {/* 子笔记列表 */}
        {note.childIds.length > 0 && <ChildNotes childIds={note.childIds} />}
      </div>

      {/* 笔记预览面板 */}
      {previewNoteId && (
        <NotePreviewPanel
          noteId={previewNoteId}
          onClose={() => setPreviewNoteId(null)}
          onNavigate={(id) => {
            setPreviewNoteId(null);
            router.push(`/notes/${id}`);
          }}
        />
      )}
    </div>
  );
}

function ChildNotes({ childIds }: { childIds: string[] }) {
  const router = useRouter();
  const [children, setChildren] = useState<Note[]>([]);

  useEffect(() => {
    Promise.all(childIds.map((id) => getNote(id))).then((notes) =>
      setChildren(notes.filter((n): n is Note => !!n))
    );
  }, [childIds]);

  if (children.length === 0) return null;

  return (
    <div className="border-t border-border px-6 py-4 bg-bg">
      <h3 className="text-sm font-semibold text-text-secondary mb-3">
        子笔记 ({children.length})
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => router.push(`/notes/${child.id}`)}
            className="flex-shrink-0 bg-white rounded-lg border border-border p-3 text-left hover:shadow-sm transition-shadow min-w-[200px] max-w-[250px]"
          >
            <p className="text-sm font-medium truncate">{child.title}</p>
            {child.sourceText && (
              <p className="text-xs text-text-secondary mt-1 line-clamp-2 italic">
                &quot;{child.sourceText}&quot;
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
