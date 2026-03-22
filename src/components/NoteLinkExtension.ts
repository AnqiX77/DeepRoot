import { Node, mergeAttributes } from "@tiptap/core";

// 自定义内联节点：笔记链接
export const NoteLink = Node.create({
  name: "noteLink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      noteId: { default: null },
      noteTitle: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-note-link]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-note-link": HTMLAttributes.noteId,
        class: "note-link",
      }),
      HTMLAttributes.noteTitle || "未命名笔记",
    ];
  },
});
