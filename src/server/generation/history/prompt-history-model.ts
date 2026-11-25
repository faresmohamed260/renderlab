import type { GenerationJobStatus, PromptGenerationOperation } from "../../../lib/capabilities/generation.ts";

export type PromptHistoryCursor = { createdAt: string; id: string };
export type PromptHistoryQuery = { search?: string; limit?: number; cursor?: PromptHistoryCursor };
export type PromptHistoryItem = {
  id: string; prompt: string; status: GenerationJobStatus; operation: PromptGenerationOperation; createdAt: string;
};
export type PromptHistoryPage = { items: PromptHistoryItem[]; nextCursor: PromptHistoryCursor | null };
type Row = { id: string; prompt: string; status: GenerationJobStatus; operation: PromptGenerationOperation; created_at: string };
type Read = (path: string, init: { method: "GET" }) => Promise<Row[]>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
function validTimestamp(value: string) {
  return timestamp.test(value) && Number.isFinite(Date.parse(value));
}
function limitFor(limit: number | undefined) {
  if (limit === undefined) return 20;
  if (!Number.isFinite(limit)) throw new RangeError("Invalid history page size");
  return Math.min(40, Math.max(1, Math.trunc(limit)));
}

// Keep the original timestamp precision; a millisecond Date roundtrip can skip
// records sharing a timestamp. Every cursor component is validated before use
// in the PostgREST logic expression.
export function promptHistoryQuery(ownerId: string, query: PromptHistoryQuery) {
  if (!uuid.test(ownerId)) throw new TypeError("Invalid owner");
  const search = (query.search ?? "").trim();
  if (search.length > 128 || /[\u0000-\u001f\u007f]/.test(search)) throw new RangeError("Invalid history search");
  const p = new URLSearchParams({
    select: "id,prompt,status,operation,created_at",
    owner_id: "eq." + ownerId,
    operation: "in.(create-image,edit-image,create-video,animate-image)",
    order: "created_at.desc,id.desc",
    limit: String(limitFor(query.limit) + 1),
  });
  // PostgREST treats '*' as a '%' alias for LIKE. Escape it too, so a
  // user's punctuation is literal rather than an accidental wildcard.
  p.set("prompt", search ? "ilike.%" + search.replace(/[\\%_*]/g, "\\$&") + "%" : "neq.");
  if (query.cursor) {
    const { createdAt, id } = query.cursor;
    if (!validTimestamp(createdAt) || !uuid.test(id)) throw new TypeError("Invalid history cursor");
    p.set("or", "(created_at.lt." + createdAt + ",and(created_at.eq." + createdAt + ",id.lt." + id + "))");
  }
  return p;
}

export async function readPromptHistory(ownerId: string, query: PromptHistoryQuery, read: Read): Promise<PromptHistoryPage> {
  const limit = limitFor(query.limit);
  const rows = await read("generation_jobs?" + promptHistoryQuery(ownerId, query).toString(), { method: "GET" });
  const items = rows.slice(0, limit).map(row => ({
    id: row.id, prompt: row.prompt, status: row.status, operation: row.operation, createdAt: row.created_at,
  }));
  const last = items.at(-1);
  return { items, nextCursor: rows.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null };
}
