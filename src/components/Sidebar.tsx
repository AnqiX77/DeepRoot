"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAllTags, recalculateTagCounts, type Tag } from "@/lib/db";
import { AISidebar } from "@/components/AISidebar";
import { useAISidebar } from "@/components/AISidebarContext";
import { SearchBar } from "@/components/SearchBar";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const { open: aiOpen } = useAISidebar();

  useEffect(() => {
    getAllTags().then(setTags);
  }, [pathname]);

  // 刷新标签（供外部调用）
  useEffect(() => {
    const handler = async () => {
      await recalculateTagCounts();
      const t = await getAllTags();
      setTags(t);
    };
    window.addEventListener("tags-updated", handler);
    return () => window.removeEventListener("tags-updated", handler);
  }, []);

  const navItems = [
    { href: "/", label: "知识树", icon: "🌳" },
    { href: "/notes", label: "笔记列表", icon: "📝" },
    { href: "/chat", label: "AI 对话", icon: "💬" },
    { href: "/guide", label: "使用说明", icon: "📖" },
  ];

  return (
    <>
      {/* 左侧导航 */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-60"
        } h-screen bg-sidebar-bg border-r border-border flex flex-col transition-all duration-200 shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && <h1 className="text-lg font-bold text-primary">DeepRoot</h1>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-border transition-colors text-sm"
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* 搜索 */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <SearchBar />
          </div>
        )}

        {/* 导航链接 */}
        <nav className="flex-1 p-2 space-y-1 overflow-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-text-secondary hover:bg-border/50"
              }`}
            >
              <span>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}

          {/* 标签目录 */}
          {!collapsed && tags.length > 0 && (
            <div className="mt-6">
              <h3 className="px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                标签
              </h3>
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/notes?tag=${encodeURIComponent(tag.name)}`}
                  className="flex items-center justify-between px-3 py-1.5 text-sm rounded-lg hover:bg-border/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                  </span>
                  <span className="text-xs text-text-secondary">{tag.noteCount}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* 新建笔记 */}
        <div className="p-3 border-t border-border">
          <Link
            href="/notes/new"
            className={`flex items-center justify-center gap-2 w-full px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors ${
              collapsed ? "px-0" : ""
            }`}
          >
            <span>+</span>
            {!collapsed && <span>新建笔记</span>}
          </Link>
        </div>
      </aside>

      {/* AI 侧边栏 */}
      {aiOpen && <AISidebar />}
    </>
  );
}
