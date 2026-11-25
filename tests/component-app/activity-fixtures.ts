import type { PublicGenerationActivity } from "@/lib/api/generation-activity-contract";

export const activityIds = {
  running: "10000000-0000-4000-8000-000000000011",
  failed: "10000000-0000-4000-8000-000000000012",
  succeeded: "10000000-0000-4000-8000-000000000013",
  queued: "10000000-0000-4000-8000-000000000014",
  preparing: "10000000-0000-4000-8000-000000000015",
  cancelling: "10000000-0000-4000-8000-000000000016",
  persisting: "10000000-0000-4000-8000-000000000017",
  cancelled: "10000000-0000-4000-8000-000000000018",
  legacy: "10000000-0000-4000-8000-000000000019",
  retry: "10000000-0000-4000-8000-000000000020",
  "run-again": "10000000-0000-4000-8000-000000000021",
  surviving: "20000000-0000-4000-8000-000000000001",
};
const date = "2026-11-25T00:00:00.000Z";
function job(id: string, status: PublicGenerationActivity["status"], summary: string,
  extra: Partial<PublicGenerationActivity> = {}): PublicGenerationActivity {
  return { id, status, operation: "create-image", outputKind: "image", prompt: summary, summary,
    outputAssetIds: [], canCancel: false, canRunAgain: false, error: null, createdAt: date,
    updatedAt: date, startedAt: null, completedAt: null, ...extra };
}
export const activityFixtures = [
  job(activityIds.running, "running", "Running fixture", { canCancel: true }),
  job(activityIds.failed, "failed", "Failed fixture", { error: { code: "generation_failed", message: "Generation did not complete. Retry when you’re ready." } }),
  job(activityIds.succeeded, "succeeded", "Succeeded fixture", { outputAssetIds: [activityIds.surviving], canRunAgain: true }),
  job(activityIds.queued, "queued", "Unbound queued fixture"),
  job(activityIds.preparing, "preparing", "Preparing fixture", { canCancel: true }),
  job(activityIds.cancelling, "cancelling", "Cancelling fixture"),
  job(activityIds.persisting, "persisting", "Persisting fixture"),
  job(activityIds.cancelled, "cancelled", "Cancelled fixture"),
  job(activityIds.legacy, "failed", "Legacy video fixture", { operation: "create-video", outputKind: "video" }),
];
export function newAttempt(action: "retry" | "run-again") {
  return job(activityIds[action], "queued", action === "retry" ? "Distinct retry fixture" : "Distinct rerun fixture");
}
