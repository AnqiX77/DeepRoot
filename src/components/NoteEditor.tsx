"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { CustomImage } from "./CustomImage";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import { common, createLowlight } from "lowlight";
import { useEffect, useRef, useCallback, useState } from "react";
import { useAISidebar } from "./AISidebarContext";
import { TagInput } from "./TagInput";
import { SelectionMenu } from "./SelectionMenu";
import { NoteLink } from "./NoteLinkExtension";
import { NoteLinkSuggestion } from "./NoteLinkSuggestion";

const lowlight = createLowlight(common);

interface NoteEditorProps {
  noteId: string | null;
  initialContent: string;
  initialTags: string[];
  noteTitle: string;
  onSave: (content: string, tags: string[], title: string) => void;
  onNoteLinkClick?: (noteId: string) => void;
}

export function NoteEditor({ noteId, initialContent, initialTags, noteTitle, onSave, onNoteLinkClick }: NoteEditorProps) {
  const { openSidebar } = useAISidebar();
  const [title, setTitle] = useState(noteTitle);
  const [tags, setTags] = useState(initialTags);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagsRef = useRef(tags);
  const titleRef = useRef(title);
  tagsRef.current = tags;
  titleRef.current = title;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // 用 CodeBlockLowlight 替代
      }),
      Placeholder.configure({
        placeholder: "开始书写你的想法...",
      }),
      CustomImage.configure({
        inline: false,
        allowBase64: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Highlight,
      NoteLink,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "tiptap prose prose-lg max-w-none focus:outline-none",
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (files?.length) {
          for (const file of Array.from(files)) {
            if (file.type.startsWith("image/")) {
              event.preventDefault();
              const reader = new FileReader();
              reader.onload = () => {
                const src = reader.result as string;
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src })
                  )
                );
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (!file) continue;
              const reader = new FileReader();
              reader.onload = () => {
                const src = reader.result as string;
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src })
                  )
                );
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      setSaveStatus("idle");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus("saving");
        onSave(editor.getHTML(), tagsRef.current, titleRef.current);
        setTimeout(() => setSaveStatus("saved"), 300);
      }, 1000);
    },
  });

  // 触发延迟保存的通用方法
  const triggerSave = useCallback(() => {
    if (!editor) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      onSave(editor.getHTML(), tagsRef.current, titleRef.current);
      setTimeout(() => setSaveStatus("saved"), 300);
    }, 500);
  }, [editor, onSave]);

  // 更新标签时也触发保存
  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      setTags(newTags);
      triggerSave();
    },
    [triggerSave]
  );

  // 更新标题时触发保存
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      titleRef.current = newTitle;
      triggerSave();
    },
    [triggerSave]
  );

  // 同步初始内容
  useEffect(() => {
    if (editor && initialContent && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  useEffect(() => {
    setTitle(noteTitle);
    titleRef.current = noteTitle;
  }, [noteTitle]);

  const handleAskAI = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) return;

    openSidebar({
      selectedText: text,
      noteId,
      noteTitle,
      noteContent: editor.getText(),
    });
  }, [editor, noteId, noteTitle, openSidebar]);

  // 点击笔记链接时打开预览
  useEffect(() => {
    if (!editor || !onNoteLinkClick) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const linkEl = target.closest("[data-note-link]");
      if (linkEl) {
        e.preventDefault();
        const id = linkEl.getAttribute("data-note-link");
        if (id) onNoteLinkClick(id);
      }
    };
    const dom = editor.view.dom;
    dom.addEventListener("click", handleClick);
    return () => dom.removeEventListener("click", handleClick);
  }, [editor, onNoteLinkClick]);

  const wordCount = editor?.getText().length || 0;

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border text-xs text-text-secondary">
        <div className="flex items-center gap-4">
          <span>{wordCount} 字</span>
          {saveStatus === "saving" && <span>保存中...</span>}
          {saveStatus === "saved" && <span className="text-green-600">已保存</span>}
        </div>
      </div>

      {/* 标题 */}
      <div className="px-4 pt-4 pb-2">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="输入笔记标题..."
          className="w-full text-2xl font-bold bg-transparent outline-none placeholder:text-text-secondary/40"
        />
      </div>

      {/* 标签区 */}
      <div className="px-4 py-2 border-b border-border">
        <TagInput tags={tags} onChange={handleTagsChange} />
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border flex-wrap">
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <span className="w-px h-5 bg-border mx-1" />
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          &lt;/&gt;
        </ToolbarButton>
        <span className="w-px h-5 bg-border mx-1" />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • 列表
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. 列表
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          引用
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          代码块
        </ToolbarButton>
        <ToolbarButton
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          分割线
        </ToolbarButton>
        <span className="w-px h-5 bg-border mx-1" />
        <ImageUploadButton editor={editor} />
      </div>

      {/* 划选浮动工具条 */}
      <SelectionMenu
        editor={editor}
        onAskAI={handleAskAI}
        onHighlight={() => editor.chain().focus().toggleHighlight().run()}
      />

      {/* [[ 笔记链接建议 */}
      <NoteLinkSuggestion editor={editor} />

      {/* 编辑器内容区 */}
      <div className="flex-1 overflow-auto px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        active ? "bg-primary/10 text-primary font-medium" : "text-text-secondary hover:bg-border/50"
      }`}
    >
      {children}
    </button>
  );
}

function ImageUploadButton({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);

    // 重置以支持重复选择同一文件
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="px-2 py-1 text-xs rounded transition-colors text-text-secondary hover:bg-border/50"
      >
        插入图片
      </button>
    </>
  );
}
