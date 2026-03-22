"use client";

import { useState, useRef } from "react";
import { createNote } from "@/lib/db";

interface FileUploadProps {
  onComplete?: () => void;
}

function textToHtml(text: string): string {
  return text
    .split(/\n/)
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      if (t.startsWith("### ")) return `<h3>${t.slice(4)}</h3>`;
      if (t.startsWith("## ")) return `<h2>${t.slice(3)}</h2>`;
      if (t.startsWith("# ")) return `<h1>${t.slice(2)}</h1>`;
      return `<p>${t}</p>`;
    })
    .join("");
}

async function parsePDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // 使用本地 worker 文件（已复制到 public 目录）
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(" ");
    pages.push(text);
  }
  return pages.join("\n\n");
}

async function readFileText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    return await parsePDF(file);
  }
  return await file.text();
}

export function FileUpload({ onComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    for (const file of Array.from(files)) {
      try {
        setProgress(`正在解析 ${file.name}...`);

        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["pdf", "txt", "md"].includes(ext || "")) {
          setError(`不支持的格式: .${ext}`);
          continue;
        }

        const text = await readFileText(file);
        if (!text.trim()) {
          setError(`${file.name} 内容为空`);
          continue;
        }

        const fileName = file.name.replace(/\.[^.]+$/, "");
        setProgress(`正在创建笔记...`);

        // 整个文件作为一篇笔记导入，不切分
        await createNote({
          title: fileName,
          content: textToHtml(text),
          tags: ["导入"],
        });

        setProgress(`${file.name} 导入完成!`);
      } catch (err) {
        console.error("文件导入失败:", err);
        setError(`${file.name} 导入失败: ${err instanceof Error ? err.message : "未知错误"}`);
      }
    }

    if (fileRef.current) fileRef.current.value = "";

    window.dispatchEvent(new Event("tags-updated"));
    setUploading(false);

    setTimeout(() => {
      setProgress("");
      onComplete?.();
    }, 1500);
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.txt,.md"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
      >
        {uploading ? progress || "处理中..." : "上传文件（PDF / TXT / MD）"}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
