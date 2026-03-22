"use client";

import { useEffect, useState } from "react";
import { getAllNotes, getAllTags, type Note, type Tag } from "@/lib/db";

interface Stats {
  totalNotes: number;
  weeklyNew: number;
  maxDepth: number;
  topTag: string;
  heatmap: Record<string, number>; // "YYYY-MM-DD" -> count
}

function computeStats(notes: Note[], tags: Tag[]): Stats {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weeklyNew = notes.filter((n) => new Date(n.createdAt) >= weekAgo).length;

  // 计算知识树最大深度
  const noteMap = new Map(notes.map((n) => [n.id, n]));
  const depthCache = new Map<string, number>();

  function getDepth(id: string): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    const note = noteMap.get(id);
    if (!note || !note.parentId || !noteMap.has(note.parentId)) {
      depthCache.set(id, 0);
      return 0;
    }
    const d = 1 + getDepth(note.parentId);
    depthCache.set(id, d);
    return d;
  }

  let maxDepth = 0;
  for (const n of notes) {
    maxDepth = Math.max(maxDepth, getDepth(n.id));
  }

  const topTag = tags.length > 0 ? tags[0].name : "-";

  // 构建过去 365 天的热力图数据
  const heatmap: Record<string, number> = {};
  for (const n of notes) {
    const day = n.createdAt.slice(0, 10);
    heatmap[day] = (heatmap[day] || 0) + 1;
  }
  // 也统计更新日期
  for (const n of notes) {
    const day = n.updatedAt.slice(0, 10);
    heatmap[day] = (heatmap[day] || 0) + 1;
  }

  return { totalNotes: notes.length, weeklyNew, maxDepth, topTag, heatmap };
}

function Heatmap({ data }: { data: Record<string, number> }) {
  const today = new Date();
  // 显示最近 20 周（140 天）
  const weeks = 20;
  const totalDays = weeks * 7;

  // 找到起始日期（最近的周日往前推 weeks 周）
  const dayOfWeek = today.getDay(); // 0=周日
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - dayOfWeek - (weeks - 1) * 7);

  const cells: { date: string; count: number; col: number; row: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    if (d > today) break;
    const dateStr = d.toISOString().slice(0, 10);
    const col = Math.floor(i / 7);
    const row = i % 7;
    cells.push({ date: dateStr, count: data[dateStr] || 0, col, row });
  }

  const maxCount = Math.max(1, ...cells.map((c) => c.count));

  function getColor(count: number): string {
    if (count === 0) return "#EBEDF0";
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return "#C6E48B";
    if (intensity < 0.5) return "#7BC96F";
    if (intensity < 0.75) return "#449646";
    return "#196127";
  }

  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (const cell of cells) {
    if (cell.row === 0) {
      const month = new Date(cell.date).getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        monthLabels.push({
          label: `${month + 1}月`,
          col: cell.col,
        });
      }
    }
  }

  const cellSize = 12;
  const gap = 3;
  const svgWidth = (weeks + 1) * (cellSize + gap);
  const svgHeight = 7 * (cellSize + gap) + 20;

  return (
    <div className="overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} className="block">
        {/* 月份标签 */}
        {monthLabels.map((m, i) => (
          <text
            key={i}
            x={m.col * (cellSize + gap)}
            y={10}
            className="fill-text-secondary"
            fontSize={10}
          >
            {m.label}
          </text>
        ))}
        {/* 格子 */}
        {cells.map((cell, i) => (
          <rect
            key={i}
            x={cell.col * (cellSize + gap)}
            y={cell.row * (cellSize + gap) + 16}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={getColor(cell.count)}
          >
            <title>
              {cell.date}: {cell.count} 次活动
            </title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

export function LearningStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    Promise.all([getAllNotes(), getAllTags()]).then(([notes, tags]) => {
      setStats(computeStats(notes, tags));
    });
  }, []);

  if (!stats) return null;

  return (
    <div className="bg-white border-b border-border">
      {/* 统计卡片 */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-secondary">学习统计</h2>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-text-secondary hover:text-primary transition-colors"
          >
            {expanded ? "收起" : "展开热力图"}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="总笔记" value={stats.totalNotes} suffix="篇" />
          <StatCard label="本周新增" value={stats.weeklyNew} suffix="篇" highlight />
          <StatCard label="知识树深度" value={stats.maxDepth} suffix="层" />
          <StatCard label="最活跃标签" value={stats.topTag} isText />
        </div>

        {/* 热力图 */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-text-secondary mb-2">每日写作活跃度（近 20 周）</p>
            <Heatmap data={stats.heatmap} />
            <div className="flex items-center gap-1 mt-2 text-[10px] text-text-secondary justify-end">
              <span>少</span>
              {["#EBEDF0", "#C6E48B", "#7BC96F", "#449646", "#196127"].map((c) => (
                <span
                  key={c}
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
              <span>多</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  highlight,
  isText,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  highlight?: boolean;
  isText?: boolean;
}) {
  return (
    <div className="bg-bg rounded-lg px-3 py-2.5">
      <p className="text-[11px] text-text-secondary">{label}</p>
      <p
        className={`text-lg font-bold mt-0.5 ${
          highlight ? "text-primary" : "text-text"
        } ${isText ? "text-sm truncate" : ""}`}
      >
        {value}
        {suffix && <span className="text-xs font-normal text-text-secondary ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}
