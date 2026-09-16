import { createClient, type User } from "@supabase/supabase-js";
import { normalizeRenderLabSessionClient } from "@/lib/auth/session-client-label";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import { sendAccountDeletionNotification } from "@/server/account/account-deletion-notification";
import { injectAccountDataLifecycleTestFault } from "@/server/account/account-data-lifecycle-test-faults";
import {
  accountProfileAvatarKey,
  getRenderLabAccountProfileRow,
  runAccountAvatarPurgeMaintenance,
} from "@/server/account/account-profile";
import { getRenderLabAccountPreferencesRow } from "@/server/account/account-preferences";
import { supabaseRest } from "@/server/data/supabase-rest";
import { requestGenerationCancellation } from "@/server/generation/cancel-generation";
import { generationStorageCandidates, type GenerationStorageKeyRow } from "@/server/generation/generation-storage-keys";
import { reconcileNativeGeneration } from "@/server/generation/reconcile-generation";
import {
  createSignedDownloadUrl,
  deleteR2Object,
  r2ObjectExists,
  writeR2Object,
} from "@/server/storage/r2";

const EXPORT_SCHEMA_VERSION = 3;
const EXPORT_PAGE_SIZE = 200;
const EXPORT_TTL_MS = 24 * 60 * 60 * 1000;
const STALE_EXPORT_PROCESSING_MS = 15 * 60 * 1000;
const ACTIVE_JOB_STATUSES = new Set(["queued", "preparing", "running", "cancelling", "persisting"]);

export type AccountLifecycleRow = {
  user_id: string;
  state: "deleting";
  requested_at: string;
  quiescence_until: string;
  retry_count: number;
  last_error_code: string | null;
  last_attempt_at: string | null;
  notification_state: "pending" | "accepted" | "failed";
  notification_attempted_at: string | null;
  notification_error_code: string | null;
  updated_at: string;
};

export type AccountExportRow = {
  id: string;
  owner_id: string;
  status: "pending" | "processing" | "ready" | "failed" | "expired";
  storage_key: string | null;
  content_type: string | null;
  size_bytes: number | string | null;
  schema_version: number;
  requested_at: string;
  generated_at: string | null;
  expires_at: string | null;
  error_code: string | null;
  updated_at: string;
};

type StorageMediaRow = {
  id: string;
  storage_key: string;
  thumbnail_storage_key: string | null;
};

type StorageSourceRow = { storage_key: string };
type StorageUploadRow = { storage_key: string };
type StorageExportRow = { storage_key: string | null };
type StorageJobRow = GenerationStorageKeyRow & { status: string };

type SessionProjectionRow = {
  session_id?: unknown;
  created_at?: unknown;
  last_active_at?: unknown;
  user_agent?: unknown;
};

export type AccountDeletionProcessResult =
  | { state: "missing" }
  | { state: "active-jobs"; activeJobs: number }
  | { state: "quiescing"; quiescenceUntil: string }
  | { state: "complete" }
  | { state: "retry"; code: string };

export type AccountExportProcessResult =
  | { state: "missing" }
  | { state: "ready"; export: AccountExportRow }
  | { state: "busy" }
  | { state: "failed"; code: string };

function serviceRoleClient() {
  const config = getSupabaseAuthConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !serviceRoleKey) return null;
  return createClient(config.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function verifyCurrentAccountPassword(email: string, password: string, expectedUserId: string) {
  const config = getSupabaseAuthConfig();
  if (!config || !password) return false;
  const verifier = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  try {
    const { data, error } = await verifier.auth.signInWithPassword({ email, password });
    if (error || data.user?.id !== expectedUserId) return false;
    return true;
  } finally {
    await verifier.auth.signOut({ scope: "local" }).catch(() => null);
  }
}

function exportPublicRow(row: AccountExportRow | null) {
  if (!row) return null;
  const expired = row.status === "ready" && row.expires_at !== null && Date.parse(row.expires_at) <= Date.now();
  return {
    id: row.id,
    status: expired ? "expired" as const : row.status,
    schemaVersion: row.schema_version,
    requestedAt: row.requested_at,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    errorCode: row.status === "failed" ? row.error_code : null,
  };
}

export async function getAccountDeletionLifecycle(userId: string) {
  const rows = await supabaseRest<AccountLifecycleRow[]>(
    `renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,
  );
  return rows[0] ?? null;
}

export async function getAccountExport(userId: string) {
  const rows = await supabaseRest<AccountExportRow[]>(
    `renderlab_account_exports?owner_id=eq.${encodeURIComponent(userId)}&select=*&order=requested_at.desc,id.desc&limit=1`,
  );
  return rows[0] ?? null;
}

export async function getPublicAccountExport(userId: string) {
  return exportPublicRow(await getAccountExport(userId));
}

async function pagedOwnerRows<T>(table: string, ownerId: string, select: string, order = "created_at.asc,id.asc") {
  const rows: T[] = [];
  for (let offset = 0; ; offset += EXPORT_PAGE_SIZE) {
    const page = await supabaseRest<T[]>(
      `${table}?owner_id=eq.${encodeURIComponent(ownerId)}&select=${encodeURIComponent(select)}&order=${encodeURIComponent(order)}&limit=${EXPORT_PAGE_SIZE}&offset=${offset}`,
    );
    rows.push(...page);
    if (page.length < EXPORT_PAGE_SIZE) return rows;
  }
}

async function accountAuthUser(userId: string): Promise<User> {
  const service = serviceRoleClient();
  if (!service) throw new Error("account_auth_unavailable");
  const { data, error } = await service.auth.admin.getUserById(userId);
  if (error || !data.user || data.user.id !== userId) throw new Error("account_auth_unavailable");
  return data.user;
}

async function accountFactorExport(userId: string) {
  const service = serviceRoleClient();
  if (!service) throw new Error("account_auth_unavailable");
  const { data, error } = await service.auth.admin.mfa.listFactors({ userId });
  if (error) throw new Error("account_auth_unavailable");
  return data.factors.map((factor) => ({
    type: factor.factor_type,
    status: factor.status,
    friendlyName: factor.friendly_name ?? null,
    createdAt: factor.created_at,
    updatedAt: factor.updated_at,
  }));
}

async function accountSessionExport(userId: string) {
  const service = serviceRoleClient();
  if (!service) throw new Error("account_sessions_unavailable");
  const { data, error } = await service.rpc("renderlab_auth_session_projection", { p_user_id: userId });
  if (error || !Array.isArray(data)) throw new Error("account_sessions_unavailable");
  return (data as SessionProjectionRow[]).flatMap((row) => {
    if (typeof row.created_at !== "string" || typeof row.last_active_at !== "string") return [];
    return [{
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      clientLabel: normalizeRenderLabSessionClient(typeof row.user_agent === "string" ? row.user_agent : null),
    }];
  });
}

async function buildAccountExport(ownerId: string) {
  const [
    user,
    accessRows,
    generationJobs,
    generationSources,
    mediaAssets,
    mediaUploadSessions,
    collections,
    collectionItems,
    reservations,
    sessions,
    mfa,
    profile,
    preferences,
    invitations,
  ] = await Promise.all([
    accountAuthUser(ownerId),
    supabaseRest<Array<Record<string, unknown>>>(
      `renderlab_account_access?user_id=eq.${encodeURIComponent(ownerId)}&select=user_id,role,status,generation_enabled,max_active_jobs,max_jobs_per_hour,created_at,updated_at&limit=1`,
    ),
    pagedOwnerRows<Record<string, unknown>>(
      "generation_jobs",
      ownerId,
      "id,status,operation,output_kind,prompt,model,inputs,parameters,output_asset_ids,error_code,error_message,created_at,updated_at,started_at,completed_at",
    ),
    pagedOwnerRows<Record<string, unknown>>(
      "generation_sources",
      ownerId,
      "id,filename,mime_type,size_bytes,width,height,purpose,status,created_at,updated_at",
    ),
    pagedOwnerRows<Record<string, unknown>>(
      "media_assets",
      ownerId,
      "id,generation_job_id,generation_output_index,origin,kind,mime_type,original_filename,display_name,size_bytes,width,height,duration_ms,provenance,favorited_at,deleted_at,purged_at,created_at,updated_at",
    ),
    pagedOwnerRows<Record<string, unknown>>(
      "media_upload_sessions",
      ownerId,
      "id,filename,display_name,mime_type,size_bytes,status,media_asset_id,created_at,updated_at",
    ),
    pagedOwnerRows<Record<string, unknown>>("media_collections", ownerId, "id,name,created_at,updated_at"),
    pagedOwnerRows<Record<string, unknown>>(
      "media_collection_items",
      ownerId,
      "collection_id,media_asset_id,created_at",
      "created_at.asc,media_asset_id.asc",
    ),
    pagedOwnerRows<Record<string, unknown>>(
      "generation_admission_reservations",
      ownerId,
      "id,admitted_at,expires_at,job_id,released_at",
      "admitted_at.asc,id.asc",
    ),
    accountSessionExport(ownerId),
    accountFactorExport(ownerId),
    getRenderLabAccountProfileRow(ownerId),
    getRenderLabAccountPreferencesRow(ownerId),
    supabaseRest<Array<Record<string, unknown>>>(
      `renderlab_beta_invitations?claimed_user_id=eq.${encodeURIComponent(ownerId)}&select=id,normalized_email,role,expires_at,claimed_at,revoked_at,created_at&order=created_at.asc,id.asc`,
    ),
  ]);

  const durableMediaManifest = mediaAssets.map((asset) => ({
    assetId: asset.id,
    kind: asset.kind,
    mimeType: asset.mime_type,
    displayName: asset.display_name,
    originalFilename: asset.original_filename,
    deletedAt: asset.deleted_at,
    purgedAt: asset.purged_at,
    downloadPath: asset.deleted_at ? null : `/api/media/assets/${asset.id}/download`,
  }));

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    account: {
      userId: user.id,
      email: user.email ?? null,
      emailConfirmedAt: user.email_confirmed_at ?? null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      access: accessRows[0] ?? null,
      signInMethods: Array.from(new Set((user.identities ?? []).map((identity) => identity.provider))).sort(),
    },
    profile: {
      displayName: profile?.display_name ?? null,
      avatar: profile?.avatar_state === "active"
        ? {
            state: "active",
            contentType: profile.avatar_content_type,
            sizeBytes: profile.avatar_size_bytes === null ? null : Number(profile.avatar_size_bytes),
            width: profile.avatar_width,
            height: profile.avatar_height,
            updatedAt: profile.avatar_updated_at,
            downloadPath: "/api/account/profile/avatar",
          }
        : {
            state: profile?.avatar_state ?? "none",
            contentType: null,
            sizeBytes: null,
            width: null,
            height: null,
            updatedAt: null,
            downloadPath: null,
          },
    },
    preferences: preferences
      ? {
          source: "saved",
          create: {
            outputKind: preferences.create_output_kind,
            imageAspectRatio: preferences.create_image_aspect_ratio,
            videoResolution: preferences.create_video_resolution,
            videoDurationSeconds: preferences.create_video_duration_seconds,
            videoAudioEnabled: preferences.create_video_audio_enabled,
          },
          updatedAt: preferences.updated_at,
        }
      : { source: "product-defaults", create: null, updatedAt: null },
    generationJobs,
    generationSources,
    mediaAssets,
    mediaUploadSessions,
    collections,
    collectionItems,
    generationAdmissionReservations: reservations,
    sessions,
    mfa,
    claimedInvitations: invitations,
    durableMediaManifest,
    retentionAndProcessing: {
      renderLabModelTraining: false,
      exportAvailabilityHours: 24,
      systems: {
        supabase: "Authentication and RenderLab product metadata/database state.",
        cloudflareR2: "Object storage for uploaded/generated media, thumbnails, temporary sources, private profile avatars and this export artifact.",
        modal: "Generation and upscale compute receives the content required for the requested operation.",
        vercel: "Hosts the RenderLab web application and API execution plane.",
      },
      deletion: "RenderLab-controlled account rows and R2 objects are removed before the Auth identity is deleted. Provider service logs follow each provider's retention/erasure contract.",
    },
  };
}

function exportStorageKey(row: AccountExportRow) {
  const requested = new Date(row.requested_at);
  const year = requested.getUTCFullYear();
  const month = String(requested.getUTCMonth() + 1).padStart(2, "0");
  return `renderlab/account-exports/${year}/${month}/${row.id}.json`;
}

async function setExportFailed(row: AccountExportRow, code: string) {
  await supabaseRest(
    `renderlab_account_exports?id=eq.${encodeURIComponent(row.id)}&owner_id=eq.${encodeURIComponent(row.owner_id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "failed",
        error_code: code,
        updated_at: new Date().toISOString(),
      }),
    },
  ).catch(() => null);
}

export async function processAccountExport(exportId: string): Promise<AccountExportProcessResult> {
  const rows = await supabaseRest<AccountExportRow[]>(
    `renderlab_account_exports?id=eq.${encodeURIComponent(exportId)}&select=*&limit=1`,
  );
  const row = rows[0];
  if (!row) return { state: "missing" };
  if (row.status === "ready") return { state: "ready", export: row };
  if (row.status === "expired") return { state: "failed", code: "account_export_expired" };
  if (row.status === "processing") return { state: "busy" };

  const claimed = await supabaseRest<AccountExportRow[]>(
    `renderlab_account_exports?id=eq.${encodeURIComponent(row.id)}&owner_id=eq.${encodeURIComponent(row.owner_id)}&status=in.(pending,failed)&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "processing", error_code: null, updated_at: new Date().toISOString() }),
    },
  );
  const processing = claimed[0];
  if (!processing) return { state: "busy" };

  try {
    const lifecycle = await getAccountDeletionLifecycle(processing.owner_id);
    if (lifecycle) throw new Error("account_deletion_in_progress");
    const artifact = await buildAccountExport(processing.owner_id);
    const bytes = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    const storageKey = exportStorageKey(processing);
    await writeR2Object({ key: storageKey, contentType: "application/json", body: bytes });
    const generatedAt = new Date();
    const readyRows = await supabaseRest<AccountExportRow[]>(
      `renderlab_account_exports?id=eq.${encodeURIComponent(processing.id)}&owner_id=eq.${encodeURIComponent(processing.owner_id)}&status=eq.processing&select=*`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          status: "ready",
          storage_key: storageKey,
          content_type: "application/json",
          size_bytes: bytes.byteLength,
          schema_version: EXPORT_SCHEMA_VERSION,
          generated_at: generatedAt.toISOString(),
          expires_at: new Date(generatedAt.getTime() + EXPORT_TTL_MS).toISOString(),
          error_code: null,
          updated_at: generatedAt.toISOString(),
        }),
      },
    );
    const ready = readyRows[0];
    if (!ready) throw new Error("account_export_state_changed");
    return { state: "ready", export: ready };
  } catch (error) {
    const code = error instanceof Error && error.message === "account_deletion_in_progress"
      ? "account_deletion_in_progress"
      : "account_export_failed";
    await setExportFailed(processing, code);
    return { state: "failed", code };
  }
}

export async function requestAccountExport(ownerId: string) {
  if (await getAccountDeletionLifecycle(ownerId)) {
    throw new Error("account_deletion_in_progress");
  }

  const existing = await getAccountExport(ownerId);
  if (existing) {
    const unexpiredReady = existing.status === "ready"
      && existing.expires_at !== null
      && Date.parse(existing.expires_at) > Date.now();
    if (unexpiredReady || existing.status === "pending" || existing.status === "processing") return existing;
    if (existing.status === "failed") {
      const reset = await supabaseRest<AccountExportRow[]>(
        `renderlab_account_exports?id=eq.${encodeURIComponent(existing.id)}&owner_id=eq.${encodeURIComponent(ownerId)}&status=eq.failed&select=*`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ status: "pending", error_code: null, updated_at: new Date().toISOString() }),
        },
      );
      if (reset[0]) return reset[0];
    }
  }

  const rows = await supabaseRest<AccountExportRow[]>("renderlab_account_exports?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ owner_id: ownerId, status: "pending", schema_version: EXPORT_SCHEMA_VERSION }),
  });
  if (!rows[0]) throw new Error("account_export_unavailable");
  return rows[0];
}

export async function accountExportDownloadUrl(ownerId: string) {
  const row = await getAccountExport(ownerId);
  if (!row || row.status !== "ready" || !row.storage_key || !row.expires_at) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;
  return createSignedDownloadUrl({
    key: row.storage_key,
    contentDisposition: `attachment; filename="renderlab-account-export-${row.id}.json"`,
    expiresIn: 300,
  });
}

export async function beginAccountDeletion(ownerId: string) {
  const rows = await supabaseRest<AccountLifecycleRow[]>("rpc/renderlab_begin_account_deletion", {
    method: "POST",
    body: JSON.stringify({ p_user_id: ownerId }),
  });
  const row = rows[0];
  if (!row) throw new Error("account_deletion_unavailable");
  return row;
}

async function activeJobs(ownerId: string) {
  return supabaseRest<Array<{ id: string; status: string }>>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&status=in.(queued,preparing,running,cancelling,persisting)&select=id,status&order=updated_at.asc,id.asc&limit=16`,
  );
}

async function settleActiveJobs(ownerId: string) {
  const jobs = await activeJobs(ownerId);
  for (const job of jobs) {
    if (job.status === "persisting" || job.status === "cancelling") {
      await reconcileNativeGeneration(ownerId, job.id).catch(() => null);
      continue;
    }
    await requestGenerationCancellation(ownerId, job.id).catch(() => null);
  }
  return activeJobs(ownerId);
}

async function accountStorageKeys(ownerId: string) {
  const [media, sources, uploads, jobs, exports] = await Promise.all([
    pagedOwnerRows<StorageMediaRow>("media_assets", ownerId, "id,storage_key,thumbnail_storage_key"),
    pagedOwnerRows<StorageSourceRow>("generation_sources", ownerId, "storage_key", "created_at.asc,id.asc"),
    pagedOwnerRows<StorageUploadRow>("media_upload_sessions", ownerId, "storage_key", "created_at.asc,id.asc"),
    pagedOwnerRows<StorageJobRow>("generation_jobs", ownerId, "id,status,output_kind,created_at"),
    pagedOwnerRows<StorageExportRow>("renderlab_account_exports", ownerId, "storage_key", "requested_at.asc,id.asc"),
  ]);
  const keys = new Set<string>();
  keys.add(accountProfileAvatarKey(ownerId));
  for (const row of media) {
    keys.add(row.storage_key);
    if (row.thumbnail_storage_key) keys.add(row.thumbnail_storage_key);
  }
  for (const row of sources) keys.add(row.storage_key);
  for (const row of uploads) keys.add(row.storage_key);
  for (const row of exports) if (row.storage_key) keys.add(row.storage_key);
  for (const row of jobs) for (const key of generationStorageCandidates(row)) keys.add(key);
  return Array.from(keys).sort();
}

async function purgeAndProveStorage(keys: string[]) {
  injectAccountDataLifecycleTestFault("r2-delete");
  for (const key of keys) await deleteR2Object(key);
  for (const key of keys) {
    if (await r2ObjectExists(key)) throw new Error("account_storage_residue");
  }
}

async function ownerResidueCount(table: string, ownerId: string) {
  const rows = await supabaseRest<Array<Record<string, unknown>>>(
    `${table}?owner_id=eq.${encodeURIComponent(ownerId)}&select=owner_id&limit=1`,
  );
  return rows.length;
}

async function verifyDatabaseResidue(ownerId: string) {
  const tables = [
    "generation_jobs",
    "generation_sources",
    "media_assets",
    "media_upload_sessions",
    "media_collections",
    "generation_admission_reservations",
    "renderlab_account_exports",
    "renderlab_account_profiles",
    "renderlab_account_preferences",
  ];
  for (const table of tables) {
    if (await ownerResidueCount(table, ownerId)) throw new Error("account_database_residue");
  }
  const collectionItems = await supabaseRest<Array<{ collection_id: string }>>(
    `media_collection_items?owner_id=eq.${encodeURIComponent(ownerId)}&select=collection_id&limit=1`,
  );
  if (collectionItems.length) throw new Error("account_database_residue");
  const invitations = await supabaseRest<Array<{ claimed_user_id: string | null; deidentified_at: string | null }>>(
    `renderlab_beta_invitations?claimed_user_id=eq.${encodeURIComponent(ownerId)}&select=claimed_user_id,deidentified_at&limit=1`,
  );
  if (invitations.length) throw new Error("account_invitation_residue");
}

async function recordDeletionRetry(row: AccountLifecycleRow, code: string) {
  await supabaseRest(
    `renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(row.user_id)}&state=eq.deleting`,
    {
      method: "PATCH",
      body: JSON.stringify({
        retry_count: row.retry_count + 1,
        last_error_code: code,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    },
  ).catch(() => null);
}

async function attemptDeletionNotification(row: AccountLifecycleRow) {
  if (row.notification_state !== "pending") return;

  let result: Awaited<ReturnType<typeof sendAccountDeletionNotification>>;
  try {
    const user = await accountAuthUser(row.user_id);
    result = typeof user.email === "string" && user.email
      ? await sendAccountDeletionNotification(user.email)
      : { state: "failed", errorCode: "account_deletion_mail_recipient_unavailable" };
  } catch {
    result = { state: "failed", errorCode: "account_deletion_mail_recipient_unavailable" };
  }

  const attemptedAt = new Date().toISOString();
  await supabaseRest(
    `renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(row.user_id)}&state=eq.deleting&notification_state=eq.pending`,
    {
      method: "PATCH",
      body: JSON.stringify({
        notification_state: result.state,
        notification_attempted_at: attemptedAt,
        notification_error_code: result.errorCode,
        updated_at: attemptedAt,
      }),
    },
  ).catch(() => null);
}

async function hardDeleteAuthUser(userId: string) {
  const service = serviceRoleClient();
  if (!service) throw new Error("account_auth_unavailable");
  injectAccountDataLifecycleTestFault("auth-delete");
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) throw new Error("account_auth_delete_failed");
}

export async function processAccountDeletion(ownerId: string): Promise<AccountDeletionProcessResult> {
  const lifecycle = await getAccountDeletionLifecycle(ownerId);
  if (!lifecycle) return { state: "missing" };

  try {
    await attemptDeletionNotification(lifecycle);
    const remainingJobs = await settleActiveJobs(ownerId);
    if (remainingJobs.length) return { state: "active-jobs", activeJobs: remainingJobs.length };
    if (Date.now() < Date.parse(lifecycle.quiescence_until)) {
      return { state: "quiescing", quiescenceUntil: lifecycle.quiescence_until };
    }

    const keys = await accountStorageKeys(ownerId);
    await purgeAndProveStorage(keys);
    await supabaseRest("rpc/renderlab_finalize_account_product_deletion", {
      method: "POST",
      body: JSON.stringify({ p_user_id: ownerId }),
    });
    await verifyDatabaseResidue(ownerId);
    for (const key of keys) {
      if (await r2ObjectExists(key)) throw new Error("account_storage_residue");
    }
    await hardDeleteAuthUser(ownerId);
    return { state: "complete" };
  } catch (error) {
    const code = error instanceof Error && /^[a-z0-9_]+$/i.test(error.message)
      ? error.message.slice(0, 80)
      : "account_deletion_retryable";
    await recordDeletionRetry(lifecycle, code);
    return { state: "retry", code };
  }
}

async function expireReadyExports(limit: number) {
  const rows = await supabaseRest<AccountExportRow[]>(
    `renderlab_account_exports?status=eq.ready&expires_at=lte.${encodeURIComponent(new Date().toISOString())}&select=*&order=expires_at.asc,id.asc&limit=${limit}`,
  );
  let expired = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      if (row.storage_key) {
        await deleteR2Object(row.storage_key);
        if (await r2ObjectExists(row.storage_key)) throw new Error("account_export_storage_residue");
      }
      await supabaseRest(
        `renderlab_account_exports?id=eq.${encodeURIComponent(row.id)}&status=eq.ready`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "expired",
            storage_key: null,
            content_type: null,
            size_bytes: null,
            updated_at: new Date().toISOString(),
          }),
        },
      );
      expired += 1;
    } catch {
      failed += 1;
    }
  }
  return { scanned: rows.length, expired, failed };
}

async function recoverStaleProcessingExports() {
  const cutoff = new Date(Date.now() - STALE_EXPORT_PROCESSING_MS).toISOString();
  await supabaseRest(
    `renderlab_account_exports?status=eq.processing&updated_at=lte.${encodeURIComponent(cutoff)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "failed", error_code: "account_export_interrupted", updated_at: new Date().toISOString() }),
    },
  );
}

export async function runAccountDataLifecycleMaintenance(limit = 4) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 8);
  await recoverStaleProcessingExports();
  const expiry = await expireReadyExports(safeLimit);
  const avatarPurge = await runAccountAvatarPurgeMaintenance(safeLimit);
  const exports = await supabaseRest<Array<{ id: string }>>(
    `renderlab_account_exports?status=in.(pending,failed)&select=id&order=updated_at.asc,id.asc&limit=${safeLimit}`,
  );
  let exportsReady = 0;
  let exportFailures = 0;
  for (const row of exports) {
    const result = await processAccountExport(row.id);
    if (result.state === "ready") exportsReady += 1;
    if (result.state === "failed") exportFailures += 1;
  }

  const deletions = await supabaseRest<Array<{ user_id: string }>>(
    `renderlab_account_lifecycle?state=eq.deleting&select=user_id&order=requested_at.asc,user_id.asc&limit=${safeLimit}`,
  );
  let deletionsComplete = 0;
  let deletionRetries = 0;
  for (const row of deletions) {
    const result = await processAccountDeletion(row.user_id);
    if (result.state === "complete") deletionsComplete += 1;
    if (result.state === "retry") deletionRetries += 1;
  }

  return {
    expiry,
    avatarPurge,
    exports: { scanned: exports.length, ready: exportsReady, failed: exportFailures },
    deletions: { scanned: deletions.length, complete: deletionsComplete, retry: deletionRetries },
  };
}

export function accountExportPublicState(row: AccountExportRow | null) {
  return exportPublicRow(row);
}
