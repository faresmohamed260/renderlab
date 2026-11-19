import { generationSeedMax } from "@/lib/capabilities/generation";

export const fiboBatchMaxOutputs = 4;
export type FiboBatchSlotStatus = "queued" | "running" | "persisting" | "succeeded" | "failed" | "cancelled";

export type FiboBatchSlot = {
  outputIndex: number;
  status: FiboBatchSlotStatus;
  seed: number;
  outputAssetId: string | null;
};

export type FiboBatchSummary = {
  requested: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  partial: boolean;
};

const slotStatuses = new Set<FiboBatchSlotStatus>([
  "queued", "running", "persisting", "succeeded", "failed", "cancelled",
]);

export function fiboBatchSeeds(baseSeed: number, count: number): number[] {
  if (!Number.isInteger(baseSeed) || baseSeed < 0 || baseSeed > generationSeedMax
    || !Number.isInteger(count) || count < 1 || count > fiboBatchMaxOutputs) {
    throw new RangeError("Invalid FIBO batch seed request.");
  }
  return Array.from({ length: count }, (_, index) => (baseSeed + index) % (generationSeedMax + 1));
}

export function summarizeFiboBatchSlots(slots: readonly FiboBatchSlot[], requestedCount: number) {
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > fiboBatchMaxOutputs
    || slots.length !== requestedCount) return null;
  const ordered = [...slots].sort((a, b) => a.outputIndex - b.outputIndex);
  if (ordered.some((slot, index) => slot.outputIndex !== index
    || !slotStatuses.has(slot.status)
    || !Number.isInteger(slot.seed) || slot.seed < 0 || slot.seed > generationSeedMax
    || (slot.status === "succeeded") !== Boolean(slot.outputAssetId))) return null;

  const succeeded = ordered.filter((slot) => slot.status === "succeeded").length;
  const failed = ordered.filter((slot) => slot.status === "failed").length;
  const cancelled = ordered.filter((slot) => slot.status === "cancelled").length;
  const active = requestedCount - succeeded - failed - cancelled;
  const terminal = active === 0;
  const status = !terminal
    ? "running"
    : succeeded > 0
      ? "succeeded"
      : failed > 0
        ? "failed"
        : "cancelled";
  return {
    requested: requestedCount,
    succeeded,
    failed,
    cancelled,
    active,
    terminal,
    partial: terminal && succeeded > 0 && succeeded < requestedCount,
    status,
    outputAssetIds: ordered.flatMap((slot) => slot.outputAssetId ? [slot.outputAssetId] : []),
  } as const;
}

export function parseFiboBatchSummary(value: unknown): FiboBatchSummary | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !["requested", "succeeded", "failed", "cancelled", "partial"].includes(key))) {
    return undefined;
  }
  const counts = [record.requested, record.succeeded, record.failed, record.cancelled];
  if (!counts.every(Number.isInteger) || typeof record.partial !== "boolean") return undefined;
  const [requested, succeeded, failed, cancelled] = counts as number[];
  if (requested < 2 || requested > 4 || [succeeded, failed, cancelled].some((count) => count < 0)
    || succeeded + failed + cancelled > requested
    || record.partial !== (succeeded > 0 && succeeded + failed + cancelled === requested && succeeded < requested)) {
    return undefined;
  }
  return { requested, succeeded, failed, cancelled, partial: record.partial };
}
