import { getAllNotes, type Note } from "./db";

function htmlToMarkdown(html: string): string {
  let md = html;
  // 标题
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  // 粗体、斜体、行内代码
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  // 引用
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const text = content.replace(/<[^>]*>/g, "").trim();
    return text.split("\n").map((l: string) => `> ${l}`).join("\n") + "\n\n";
  });
  // 列表项
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, (_, content) => {
    return "- " + content.replace(/<[^>]*>/g, "").trim() + "\n";
  });
  md = md.replace(/<\/?[uo]l[^>]*>/gi, "\n");
  // 代码块
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "\n```\n$1\n```\n\n");
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n```\n$1\n```\n\n");
  // 图片
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)");
  // 分割线
  md = md.replace(/<hr[^>]*\/?>/gi, "\n---\n\n");
  // 段落
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  // 高亮
  md = md.replace(/<mark[^>]*>(.*?)<\/mark>/gi, "==$1==");
  // 清理剩余标签
  md = md.replace(/<[^>]*>/g, "");
  // 清理多余空行
  md = md.replace(/\n{3,}/g, "\n\n");
  // 还原 HTML 实体
  md = md.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  return md.trim() + "\n";
}

function noteToMarkdown(note: Note): string {
  const frontmatter = [
    "---",
    `title: "${note.title}"`,
    `tags: [${note.tags.map((t) => `"${t}"`).join(", ")}]`,
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    note.parentId ? `parentId: ${note.parentId}` : null,
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  return frontmatter + htmlToMarkdown(note.content);
}

/** 提取笔记中的 base64 图片，返回 {filename, data} 对 */
function extractImages(note: Note): { filename: string; data: string }[] {
  const images: { filename: string; data: string }[] = [];
  const regex = /src="(data:image\/([^;]+);base64,([^"]+))"/g;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(note.content)) !== null) {
    const ext = match[2] === "jpeg" ? "jpg" : match[2];
    images.push({
      filename: `${note.id}_${idx}.${ext}`,
      data: match[3],
    });
    idx++;
  }
  return images;
}

export function exportSingleNote(note: Note): void {
  const md = noteToMarkdown(note);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${note.title.replace(/[/\\?%*:|"<>]/g, "_")}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAllNotes(): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const notes = await getAllNotes();

  const imagesFolder = zip.folder("images");

  for (const note of notes) {
    // 提取图片并替换为相对路径
    const images = extractImages(note);
    let md = noteToMarkdown(note);

    for (const img of images) {
      if (imagesFolder) {
        // base64 -> binary
        const binary = atob(img.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        imagesFolder.file(img.filename, bytes);

        // 替换 markdown 中的 base64 路径为相对路径
        md = md.replace(/!\[([^\]]*)\]\(data:image\/[^)]+\)/, `![$1](images/${img.filename})`);
      }
    }

    const safeName = note.title.replace(/[/\\?%*:|"<>]/g, "_");
    zip.file(`${safeName}.md`, md);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `知识库导出_${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
