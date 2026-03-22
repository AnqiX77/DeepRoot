import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { v4 as uuidv4 } from "uuid";

// ─── Schema ────────────────────────────────────────────────────
export interface Note {
  id: string;
  title: string;
  content: string; // HTML from tiptap
  tags: string[];
  parentId: string | null;
  childIds: string[];
  sourceText: string; // 触发该笔记的划选原文
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  noteCount: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

interface KnowledgeBaseDB extends DBSchema {
  notes: { key: string; value: Note; indexes: { "by-parent": string; "by-updated": string } };
  tags: { key: string; value: Tag; indexes: { "by-name": string } };
  chat_sessions: { key: string; value: ChatSession };
  embeddings: { key: string; value: { id: string; noteId: string; chunk: string; vector: number[] } };
}

// ─── DB Instance ───────────────────────────────────────────────
let dbPromise: Promise<IDBPDatabase<KnowledgeBaseDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<KnowledgeBaseDB>("knowledge-base", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const noteStore = db.createObjectStore("notes", { keyPath: "id" });
          noteStore.createIndex("by-parent", "parentId");
          noteStore.createIndex("by-updated", "updatedAt");

          const tagStore = db.createObjectStore("tags", { keyPath: "id" });
          tagStore.createIndex("by-name", "name", { unique: true });

          db.createObjectStore("chat_sessions", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("embeddings")) {
            db.createObjectStore("embeddings", { keyPath: "id" });
          }
        }
      },
    });
  }
  return dbPromise;
}

// ─── Notes CRUD ────────────────────────────────────────────────
export async function createNote(partial: Partial<Note> = {}): Promise<Note> {
  const db = await getDB();
  const now = new Date().toISOString();
  const note: Note = {
    id: uuidv4(),
    title: partial.title || "无标题笔记",
    content: partial.content || "",
    tags: partial.tags || [],
    parentId: partial.parentId || null,
    childIds: partial.childIds || [],
    sourceText: partial.sourceText || "",
    createdAt: now,
    updatedAt: now,
  };
  await db.put("notes", note);

  // 如果有父笔记，更新父笔记的 childIds
  if (note.parentId) {
    const parent = await db.get("notes", note.parentId);
    if (parent && !parent.childIds.includes(note.id)) {
      parent.childIds = [...parent.childIds, note.id];
      parent.updatedAt = now;
      await db.put("notes", parent);
    }
  }

  // 更新标签计数
  for (const tagName of note.tags) {
    await ensureTag(tagName);
  }

  return note;
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDB();
  return db.get("notes", id);
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAll("notes");
  return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined> {
  const db = await getDB();
  const note = await db.get("notes", id);
  if (!note) return undefined;

  const oldTags = note.tags;
  const updated = { ...note, ...updates, updatedAt: new Date().toISOString() };
  await db.put("notes", updated);

  // 标签变动时更新计数
  const newTags = updated.tags;
  const removed = oldTags.filter((t) => !newTags.includes(t));
  const added = newTags.filter((t) => !oldTags.includes(t));
  for (const t of removed) await decrementTagCount(t);
  for (const t of added) await ensureTag(t);

  return updated;
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  const note = await db.get("notes", id);
  if (!note) return;

  // 从父笔记的 childIds 中移除
  if (note.parentId) {
    const parent = await db.get("notes", note.parentId);
    if (parent) {
      parent.childIds = parent.childIds.filter((c) => c !== id);
      await db.put("notes", parent);
    }
  }

  // 将子笔记的 parentId 置空
  for (const childId of note.childIds) {
    const child = await db.get("notes", childId);
    if (child) {
      child.parentId = null;
      await db.put("notes", child);
    }
  }

  // 更新标签计数
  for (const t of note.tags) await decrementTagCount(t);

  await db.delete("notes", id);
}

export async function getNotesByTag(tagName: string): Promise<Note[]> {
  const all = await getAllNotes();
  return all.filter((n) => n.tags.includes(tagName));
}

export async function getNoteChildren(parentId: string): Promise<Note[]> {
  const db = await getDB();
  return db.getAllFromIndex("notes", "by-parent", parentId);
}

// ─── Tags CRUD ─────────────────────────────────────────────────
const TAG_COLORS = [
  "#166534", "#059669", "#D97706", "#DC2626", "#7C3AED",
  "#0891B2", "#DB2777", "#65A30D", "#EA580C", "#2563EB",
];

export async function ensureTag(name: string): Promise<Tag> {
  const db = await getDB();
  const tx = db.transaction("tags", "readwrite");
  const idx = tx.store.index("by-name");
  let tag = await idx.get(name);
  if (tag) {
    tag.noteCount += 1;
    await tx.store.put(tag);
  } else {
    const allTags = await tx.store.getAll();
    tag = {
      id: uuidv4(),
      name,
      color: TAG_COLORS[allTags.length % TAG_COLORS.length],
      noteCount: 1,
    };
    await tx.store.put(tag);
  }
  await tx.done;
  return tag;
}

async function decrementTagCount(name: string) {
  const db = await getDB();
  const tx = db.transaction("tags", "readwrite");
  const idx = tx.store.index("by-name");
  const tag = await idx.get(name);
  if (tag) {
    tag.noteCount = Math.max(0, tag.noteCount - 1);
    await tx.store.put(tag);
  }
  await tx.done;
}

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDB();
  const tags = await db.getAll("tags");
  return tags.sort((a, b) => b.noteCount - a.noteCount);
}

export async function recalculateTagCounts(): Promise<void> {
  const db = await getDB();
  const notes = await db.getAll("notes");
  const counts: Record<string, number> = {};
  for (const n of notes) {
    for (const t of n.tags) {
      counts[t] = (counts[t] || 0) + 1;
    }
  }
  const tx = db.transaction("tags", "readwrite");
  const allTags = await tx.store.getAll();
  for (const tag of allTags) {
    tag.noteCount = counts[tag.name] || 0;
    await tx.store.put(tag);
  }
  await tx.done;
}

// ─── Chat Sessions ─────────────────────────────────────────────
export async function createChatSession(): Promise<ChatSession> {
  const db = await getDB();
  const session: ChatSession = {
    id: uuidv4(),
    title: "新对话",
    messages: [],
    createdAt: new Date().toISOString(),
  };
  await db.put("chat_sessions", session);
  return session;
}

export async function getChatSession(id: string): Promise<ChatSession | undefined> {
  const db = await getDB();
  return db.get("chat_sessions", id);
}

export async function getAllChatSessions(): Promise<ChatSession[]> {
  const db = await getDB();
  const sessions = await db.getAll("chat_sessions");
  return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateChatSession(id: string, updates: Partial<ChatSession>): Promise<void> {
  const db = await getDB();
  const session = await db.get("chat_sessions", id);
  if (!session) return;
  await db.put("chat_sessions", { ...session, ...updates });
}

export async function deleteChatSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("chat_sessions", id);
}

// ─── Embeddings ────────────────────────────────────────────────
export interface EmbeddingRecord {
  id: string;
  noteId: string;
  chunk: string;
  vector: number[];
}

export async function saveEmbeddings(records: EmbeddingRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("embeddings", "readwrite");
  for (const r of records) {
    await tx.store.put(r);
  }
  await tx.done;
}

export async function deleteEmbeddingsByNote(noteId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("embeddings", "readwrite");
  const all = await tx.store.getAll();
  for (const r of all) {
    if (r.noteId === noteId) await tx.store.delete(r.id);
  }
  await tx.done;
}

export async function getAllEmbeddings(): Promise<EmbeddingRecord[]> {
  const db = await getDB();
  return db.getAll("embeddings");
}
