import { supabaseRest } from "@/server/data/supabase-rest";
import { deleteMediaAsset } from "@/server/media/media-assets";
import { deleteR2Object } from "@/server/storage/r2";

type SourceRow = {
  id: string;
  owner_id: string;
  storage_key: string;
  status: "pending" | "ready" | "failed" | "cleaning";
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type UploadRow = {
  id: string;
  owner_id: string;
  storage_key: string;
  status: "pending" | "completed" | "failed" | "cleaning";
  media_asset_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type PurgeRow = {
  id: string;
  owner_id: string;
};

export type RenderLabMaintenanceSummary = {
  sourceClaims: { scanned: number; claimed: number; skippedReferenced: number; failed: number };
  sourceCleanup: { scanned: number; deleted: number; restoredReferenced: number; failed: number };
  uploadClaims: { scanned: number; claimed: number; failed: number };
  uploadCleanup: { scanned: number; deleted: number; adopted: number; failed: number };
  mediaPurges: { scanned: number; purged: number; pending: number; failed: number };
};

const staleAgeMs = 24 * 60 * 60 * 1000;
const cleanupQuiescenceMs = 15 * 60 * 1000;
const defaultBatchLimit = 8;
const faultedDeleteKeys = new Set<string>();

function boundedLimit(limit: number) {
  return Math.min(Math.max(Math.trunc(limit), 1), 16);
}

function testOwnerFilter() {
  if (process.env.RENDERLAB_TEST_MAINTENANCE_OWNER_SCOPE !== "true") return "";
  const ownerId = process.env.RENDERLAB_TEST_MAINTENANCE_OWNER_ID?.trim();
  if (!ownerId) throw new Error("Maintenance test owner scope is enabled without an owner ID.");
  return `&owner_id=eq.${encodeURIComponent(ownerId)}`;
}

function metadataWithoutCleanupMarker(metadata: Record<string, unknown> | null) {
  const next = { ...(metadata ?? {}) };
  delete next.cleanupPreviousStatus;
  return next;
}

async function sourceIsReferenced(sourceId: string) {
  return supabaseRest<boolean>("rpc/renderlab_generation_source_is_referenced", {
    method: "POST",
    body: JSON.stringify({ p_source_id: sourceId }),
  });
}

async function claimSource(sourceId: string, cutoff: string) {
  return supabaseRest<string | null>("rpc/renderlab_claim_generation_source_cleanup", {
    method: "POST",
    body: JSON.stringify({ p_source_id: sourceId, p_cutoff: cutoff }),
  });
}

async function restoreSource(sourceId: string) {
  return supabaseRest<boolean>("rpc/renderlab_restore_generation_source_cleanup", {
    method: "POST",
    body: JSON.stringify({ p_source_id: sourceId }),
  });
}

async function claimUpload(uploadId: string, cutoff: string) {
  return supabaseRest<string | null>("rpc/renderlab_claim_media_upload_cleanup", {
    method: "POST",
    body: JSON.stringify({ p_upload_id: uploadId, p_cutoff: cutoff }),
  });
}

async function deleteMaintenanceObject(storageKey: string) {
  const shouldFault = process.env.RENDERLAB_TEST_MAINTENANCE_FAULTS === "true"
    && storageKey.includes("/maintenance-fail-delete/")
    && !faultedDeleteKeys.has(storageKey);
  if (shouldFault) {
    faultedDeleteKeys.add(storageKey);
    throw new Error("Injected Phase 15 maintenance object deletion failure.");
  }
  await deleteR2Object(storageKey);
}

async function listSourceClaims(limit: number, cutoff: string) {
  return supabaseRest<SourceRow[]>(
    `generation_sources?status=in.(pending,ready,failed)&created_at=lte.${encodeURIComponent(cutoff)}${testOwnerFilter()}&select=id,owner_id,storage_key,status,metadata,created_at,updated_at&order=created_at.asc,id.asc&limit=${limit}`,
    { method: "GET" },
  );
}

async function listSourceCleanup(limit: number, cutoff: string) {
  return supabaseRest<SourceRow[]>(
    `generation_sources?status=eq.cleaning&updated_at=lte.${encodeURIComponent(cutoff)}${testOwnerFilter()}&select=id,owner_id,storage_key,status,metadata,created_at,updated_at&order=updated_at.asc,id.asc&limit=${limit}`,
    { method: "GET" },
  );
}

async function listUploadClaims(limit: number, cutoff: string) {
  return supabaseRest<UploadRow[]>(
    `media_upload_sessions?status=in.(pending,failed)&media_asset_id=is.null&created_at=lte.${encodeURIComponent(cutoff)}${testOwnerFilter()}&select=id,owner_id,storage_key,status,media_asset_id,metadata,created_at,updated_at&order=created_at.asc,id.asc&limit=${limit}`,
    { method: "GET" },
  );
}

async function listUploadCleanup(limit: number, cutoff: string) {
  return supabaseRest<UploadRow[]>(
    `media_upload_sessions?status=eq.cleaning&updated_at=lte.${encodeURIComponent(cutoff)}${testOwnerFilter()}&select=id,owner_id,storage_key,status,media_asset_id,metadata,created_at,updated_at&order=updated_at.asc,id.asc&limit=${limit}`,
    { method: "GET" },
  );
}

async function findMediaByStorageKey(ownerId: string, storageKey: string) {
  const rows = await supabaseRest<Array<{ id: string }>>(
    `media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&storage_key=eq.${encodeURIComponent(storageKey)}&select=id&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

async function claimOldSources(limit: number, cutoff: string) {
  const candidates = await listSourceClaims(limit, cutoff);
  const summary = { scanned: candidates.length, claimed: 0, skippedReferenced: 0, failed: 0 };
  for (const source of candidates) {
    try {
      if (await sourceIsReferenced(source.id)) {
        summary.skippedReferenced += 1;
        continue;
      }
      const previousStatus = await claimSource(source.id, cutoff);
      if (previousStatus) summary.claimed += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}

async function cleanClaimedSources(limit: number, cutoff: string) {
  const candidates = await listSourceCleanup(limit, cutoff);
  const summary = { scanned: candidates.length, deleted: 0, restoredReferenced: 0, failed: 0 };
  for (const source of candidates) {
    try {
      if (await sourceIsReferenced(source.id)) {
        if (await restoreSource(source.id)) summary.restoredReferenced += 1;
        continue;
      }
      await deleteMaintenanceObject(source.storage_key);
      const deleted = await supabaseRest<Array<{ id: string }>>(
        `generation_sources?id=eq.${encodeURIComponent(source.id)}&owner_id=eq.${encodeURIComponent(source.owner_id)}&status=eq.cleaning&select=id`,
        { method: "DELETE", headers: { Prefer: "return=representation" } },
      );
      if (deleted?.[0]) summary.deleted += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}

async function claimOldUploads(limit: number, cutoff: string) {
  const candidates = await listUploadClaims(limit, cutoff);
  const summary = { scanned: candidates.length, claimed: 0, failed: 0 };
  for (const upload of candidates) {
    try {
      const previousStatus = await claimUpload(upload.id, cutoff);
      if (previousStatus) summary.claimed += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}

async function cleanClaimedUploads(limit: number, cutoff: string) {
  const candidates = await listUploadCleanup(limit, cutoff);
  const summary = { scanned: candidates.length, deleted: 0, adopted: 0, failed: 0 };
  for (const upload of candidates) {
    try {
      const asset = await findMediaByStorageKey(upload.owner_id, upload.storage_key);
      if (asset) {
        const completedAt = new Date().toISOString();
        const rows = await supabaseRest<Array<{ id: string }>>(
          `media_upload_sessions?id=eq.${encodeURIComponent(upload.id)}&owner_id=eq.${encodeURIComponent(upload.owner_id)}&status=eq.cleaning&select=id`,
          {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
              status: "completed",
              media_asset_id: asset.id,
              metadata: metadataWithoutCleanupMarker(upload.metadata),
              updated_at: completedAt,
            }),
          },
        );
        if (rows?.[0]) summary.adopted += 1;
        continue;
      }

      await deleteMaintenanceObject(upload.storage_key);
      const deleted = await supabaseRest<Array<{ id: string }>>(
        `media_upload_sessions?id=eq.${encodeURIComponent(upload.id)}&owner_id=eq.${encodeURIComponent(upload.owner_id)}&status=eq.cleaning&media_asset_id=is.null&select=id`,
        { method: "DELETE", headers: { Prefer: "return=representation" } },
      );
      if (deleted?.[0]) summary.deleted += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}

async function retryPendingMediaPurges(limit: number) {
  const ownerFilter = testOwnerFilter();
  const candidates = await supabaseRest<PurgeRow[]>(
    `media_assets?deleted_at=not.is.null&purged_at=is.null${ownerFilter}&select=id,owner_id&order=deleted_at.asc,id.asc&limit=${limit}`,
    { method: "GET" },
  );
  const summary = { scanned: candidates.length, purged: 0, pending: 0, failed: 0 };
  for (const asset of candidates) {
    try {
      const result = await deleteMediaAsset(asset.owner_id, asset.id);
      if (result?.purgedAt && !result.cleanupPending) summary.purged += 1;
      else summary.pending += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}

export async function runRenderLabMaintenance(limit = defaultBatchLimit): Promise<RenderLabMaintenanceSummary> {
  const safeLimit = boundedLimit(limit);
  const now = Date.now();
  const staleCutoff = new Date(now - staleAgeMs).toISOString();
  const quiescenceCutoff = new Date(now - cleanupQuiescenceMs).toISOString();

  // Finalize previously claimed staging first. Newly claimed rows intentionally wait
  // for a later invocation so in-flight product requests have time to publish their
  // durable job/media reference and win over maintenance.
  const sourceCleanup = await cleanClaimedSources(safeLimit, quiescenceCutoff);
  const uploadCleanup = await cleanClaimedUploads(safeLimit, quiescenceCutoff);
  const mediaPurges = await retryPendingMediaPurges(safeLimit);
  const sourceClaims = await claimOldSources(safeLimit, staleCutoff);
  const uploadClaims = await claimOldUploads(safeLimit, staleCutoff);

  return { sourceClaims, sourceCleanup, uploadClaims, uploadCleanup, mediaPurges };
}
