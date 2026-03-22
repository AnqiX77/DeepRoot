"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const isBlock = match || (typeof children === "string" && children.includes("\n"));
          if (isBlock) {
            return (
              <pre className="bg-[#1E1E2E] text-[#CDD6F4] rounded-lg p-4 overflow-x-auto my-3">
                <code className={`font-mono text-sm ${className || ""}`} {...props}>
                  {children}
                </code>
              </pre>
            );
          }
          return (
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
