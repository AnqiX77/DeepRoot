"use client";

import { useState, useEffect, useRef } from "react";
import { getAllTags, type Tag } from "@/lib/db";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllTags().then(setAllTags);
  }, []);

  useEffect(() => {
    if (input.startsWith("#")) {
      const query = input.slice(1).toLowerCase();
      const filtered = allTags.filter(
        (t) => t.name.toLowerCase().includes(query) && !tags.includes(t.name)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else if (input) {
      const query = input.toLowerCase();
      const filtered = allTags.filter(
        (t) => t.name.toLowerCase().includes(query) && !tags.includes(t.name)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [input, allTags, tags]);

  const addTag = (name: string) => {
    const trimmed = name.replace(/^#/, "").trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (name: string) => {
    onChange(tags.filter((t) => t !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
          >
            #{tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:text-red-500 transition-colors"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={tags.length === 0 ? "输入 # 添加标签" : ""}
          className="flex-1 min-w-[100px] text-sm bg-transparent outline-none placeholder:text-text-secondary/50"
        />
      </div>

      {/* 标签建议下拉 */}
      {showSuggestions && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-border rounded-lg shadow-lg py-1 z-50">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              onMouseDown={() => addTag(tag.name)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-border/50 transition-colors text-left"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
              <span>{tag.name}</span>
              <span className="text-xs text-text-secondary ml-auto">{tag.noteCount}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
