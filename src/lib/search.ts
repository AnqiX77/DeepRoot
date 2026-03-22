import MiniSearch from "minisearch";
import { getAllNotes, type Note } from "./db";

let searchIndex: MiniSearch | null = null;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function createIndex(): MiniSearch {
  return new MiniSearch({
    fields: ["title", "content", "tagsText"],
    storeFields: ["title", "content", "tags", "updatedAt", "parentId"],
    searchOptions: {
      boost: { title: 3, tagsText: 2 },
      fuzzy: 0.2,
      prefix: true,
    },
    tokenize: (text) => {
      // 中文按字符分词 + 英文按空格分词
      const tokens: string[] = [];
      let current = "";
      for (const char of text) {
        if (/[\u4e00-\u9fff]/.test(char)) {
          if (current) {
            tokens.push(current.toLowerCase());
            current = "";
          }
          tokens.push(char);
        } else if (/\s/.test(char)) {
          if (current) {
            tokens.push(current.toLowerCase());
            current = "";
          }
        } else {
          current += char;
        }
      }
      if (current) tokens.push(current.toLowerCase());
      return tokens;
    },
  });
}

export async function buildSearchIndex(): Promise<void> {
  const notes = await getAllNotes();
  searchIndex = createIndex();
  const docs = notes.map((n) => ({
    id: n.id,
    title: n.title,
    content: stripHtml(n.content),
    tags: n.tags,
    tagsText: n.tags.join(" "),
    updatedAt: n.updatedAt,
    parentId: n.parentId,
  }));
  searchIndex.addAll(docs);
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
  parentId: string | null;
  score: number;
  matches: string[]; // 匹配的字段
}

export async function searchNotes(query: string): Promise<SearchResult[]> {
  if (!searchIndex) await buildSearchIndex();
  if (!query.trim()) return [];

  const results = searchIndex!.search(query, { combineWith: "OR" });
  return results.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    tags: r.tags,
    updatedAt: r.updatedAt,
    parentId: r.parentId,
    score: r.score,
    matches: Object.keys(r.match),
  }));
}

export function invalidateSearchIndex(): void {
  searchIndex = null;
}
