import { getAllEmbeddings, saveEmbeddings, deleteEmbeddingsByNote, type EmbeddingRecord } from "./db";
import { v4 as uuidv4 } from "uuid";

// 动态导入 transformers.js（只在浏览器端加载）
let pipeline: any = null;
let embeddingModel: any = null;

async function getEmbeddingPipeline() {
  if (embeddingModel) return embeddingModel;

  try {
    const { pipeline: createPipeline } = await import("@xenova/transformers");
    pipeline = createPipeline;
    embeddingModel = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    return embeddingModel;
  } catch (err) {
    console.warn("无法加载 embedding 模型，RAG 功能将不可用:", err);
    return null;
  }
}

// 将文本分段（约 300 字）
function chunkText(text: string, chunkSize = 300): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[。！？\n.!?]+/).filter((s) => s.trim());

  let currentChunk = "";
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? "。" : "") + sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text.slice(0, chunkSize)];
}

// 生成 embedding 向量
async function embed(text: string): Promise<number[] | null> {
  const model = await getEmbeddingPipeline();
  if (!model) return null;

  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

// 对一篇笔记生成并存储 embeddings
export async function indexNote(noteId: string, content: string): Promise<void> {
  // 去除 HTML 标签
  const plainText = content.replace(/<[^>]*>/g, "").trim();
  if (!plainText) return;

  // 删除旧的 embeddings
  await deleteEmbeddingsByNote(noteId);

  const chunks = chunkText(plainText);
  const records: EmbeddingRecord[] = [];

  for (const chunk of chunks) {
    const vector = await embed(chunk);
    if (vector) {
      records.push({
        id: uuidv4(),
        noteId,
        chunk,
        vector,
      });
    }
  }

  if (records.length > 0) {
    await saveEmbeddings(records);
  }
}

// 余弦相似度
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 搜索相关笔记片段
export async function searchSimilar(
  query: string,
  topK = 3
): Promise<{ noteId: string; chunk: string; score: number }[]> {
  const queryVector = await embed(query);
  if (!queryVector) return [];

  const allEmbeddings = await getAllEmbeddings();
  if (allEmbeddings.length === 0) return [];

  const scored = allEmbeddings.map((record) => ({
    noteId: record.noteId,
    chunk: record.chunk,
    score: cosineSimilarity(queryVector, record.vector),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
