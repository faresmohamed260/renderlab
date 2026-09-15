import sharp from "sharp";
import { supabaseRest } from "@/server/data/supabase-rest";
import {
  createSignedReadUrl,
  deleteR2Object,
  headR2Object,
  r2ObjectExists,
  writeR2Object,
} from "@/server/storage/r2";

const PROFILE_DISPLAY_NAME_MAX_CODE_POINTS = 80;
const AVATAR_MAX_SOURCE_BYTES = 3 * 1024 * 1024;
const AVATAR_MAX_DIMENSION = 8192;
const AVATAR_MIN_DIMENSION = 64;
const AVATAR_MAX_PIXELS = 40_000_000;
const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_CONTENT_TYPE = "image/webp";
const AVATAR_ALLOWED_INPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CONTROL_CHARACTERS = /\p{Cc}/u;

export type RenderLabAccountProfileRow = {
  owner_id: string;
  display_name: string | null;
  avatar_state: "none" | "active" | "purge_pending";
  avatar_content_type: string | null;
  avatar_size_bytes: number | string | null;
  avatar_width: number | null;
  avatar_height: number | null;
  avatar_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RenderLabAccountProfile = {
  displayName: string | null;
  avatarState: "none" | "active" | "purge_pending";
  avatarUpdatedAt: string | null;
  avatarUrl: string | null;
};

export type RenderLabAvatarCrop = {
  centerX: number;
  centerY: number;
  zoom: number;
};

export type AccountAvatarMaintenanceResult = {
  scanned: number;
  settled: number;
  failed: number;
};

function publicProfile(row: RenderLabAccountProfileRow | null): RenderLabAccountProfile {
  return {
    displayName: row?.display_name ?? null,
    avatarState: row?.avatar_state ?? "none",
    avatarUpdatedAt: row?.avatar_state === "active" ? row.avatar_updated_at : null,
    avatarUrl: row?.avatar_state === "active" ? "/api/account/profile/avatar" : null,
  };
}

export function accountProfileAvatarKey(ownerId: string) {
  return `renderlab/account-profiles/${ownerId}/avatar.webp`;
}

export function normalizeRenderLabDisplayName(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("profile_display_name_invalid");

  const unicode = value.normalize("NFC");
  if (CONTROL_CHARACTERS.test(unicode)) throw new Error("profile_display_name_invalid");
  const normalized = unicode.trim().replace(/\s+/gu, " ");
  if (!normalized) return null;
  if (Array.from(normalized).length > PROFILE_DISPLAY_NAME_MAX_CODE_POINTS) {
    throw new Error("profile_display_name_too_long");
  }
  return normalized;
}

export async function getRenderLabAccountProfileRow(ownerId: string) {
  const rows = await supabaseRest<RenderLabAccountProfileRow[]>(
    `renderlab_account_profiles?owner_id=eq.${encodeURIComponent(ownerId)}&select=*&limit=1`,
  );
  return rows[0] ?? null;
}

export async function getRenderLabAccountProfile(ownerId: string) {
  return publicProfile(await getRenderLabAccountProfileRow(ownerId));
}

async function assertProfileMutationAllowed(ownerId: string) {
  const rows = await supabaseRest<Array<{ user_id: string }>>(
    `renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(ownerId)}&state=eq.deleting&select=user_id&limit=1`,
  );
  if (rows.length) throw new Error("account_deletion_in_progress");
}

async function upsertProfile(ownerId: string, patch: Record<string, unknown>) {
  const rows = await supabaseRest<RenderLabAccountProfileRow[]>(
    `renderlab_account_profiles?on_conflict=owner_id&select=*`,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ owner_id: ownerId, ...patch, updated_at: new Date().toISOString() }),
    },
  );
  if (!rows[0]) throw new Error("account_profile_unavailable");
  return rows[0];
}

export async function updateRenderLabDisplayName(ownerId: string, value: unknown) {
  await assertProfileMutationAllowed(ownerId);
  return publicProfile(await upsertProfile(ownerId, { display_name: normalizeRenderLabDisplayName(value) }));
}

function parseCrop(crop: Partial<RenderLabAvatarCrop> | null | undefined): RenderLabAvatarCrop {
  if (!crop) return { centerX: 0.5, centerY: 0.5, zoom: 1 };
  const centerX = Number(crop.centerX);
  const centerY = Number(crop.centerY);
  const zoom = Number(crop.zoom);
  if (
    !Number.isFinite(centerX)
    || !Number.isFinite(centerY)
    || !Number.isFinite(zoom)
    || centerX < 0
    || centerX > 1
    || centerY < 0
    || centerY > 1
    || zoom < 1
    || zoom > 8
  ) {
    throw new Error("avatar_crop_invalid");
  }
  return { centerX, centerY, zoom };
}

function orientedDimensions(width: number, height: number, orientation: number | undefined) {
  return orientation && orientation >= 5 && orientation <= 8
    ? { width: height, height: width }
    : { width, height };
}

async function normalizeAvatarSource(bytes: Uint8Array, contentType: string, cropInput?: Partial<RenderLabAvatarCrop> | null) {
  if (!AVATAR_ALLOWED_INPUT_TYPES.has(contentType)) throw new Error("avatar_type_unsupported");
  if (!bytes.byteLength || bytes.byteLength > AVATAR_MAX_SOURCE_BYTES) throw new Error("avatar_file_too_large");

  const input = sharp(bytes, {
    animated: false,
    failOn: "error",
    limitInputPixels: AVATAR_MAX_PIXELS,
  });
  const metadata = await input.metadata();
  if (!metadata.width || !metadata.height) throw new Error("avatar_image_invalid");
  if ((metadata.pages ?? 1) !== 1) throw new Error("avatar_animation_unsupported");
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) throw new Error("avatar_type_unsupported");

  const oriented = orientedDimensions(metadata.width, metadata.height, metadata.orientation);
  if (
    oriented.width < AVATAR_MIN_DIMENSION
    || oriented.height < AVATAR_MIN_DIMENSION
    || oriented.width > AVATAR_MAX_DIMENSION
    || oriented.height > AVATAR_MAX_DIMENSION
    || oriented.width * oriented.height > AVATAR_MAX_PIXELS
  ) {
    throw new Error("avatar_dimensions_invalid");
  }

  const crop = parseCrop(cropInput);
  const baseSquare = Math.min(oriented.width, oriented.height);
  const squareSize = Math.max(1, Math.min(baseSquare, Math.round(baseSquare / crop.zoom)));
  const centerX = crop.centerX * oriented.width;
  const centerY = crop.centerY * oriented.height;
  const left = Math.max(0, Math.min(oriented.width - squareSize, Math.round(centerX - squareSize / 2)));
  const top = Math.max(0, Math.min(oriented.height - squareSize, Math.round(centerY - squareSize / 2)));

  const result = await sharp(bytes, {
    animated: false,
    failOn: "error",
    limitInputPixels: AVATAR_MAX_PIXELS,
  })
    .rotate()
    .extract({ left, top, width: squareSize, height: squareSize })
    .resize(AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE, { fit: "fill" })
    .webp({ quality: 88 })
    .toBuffer({ resolveWithObject: true });

  if (result.info.width !== AVATAR_OUTPUT_SIZE || result.info.height !== AVATAR_OUTPUT_SIZE) {
    throw new Error("avatar_normalization_failed");
  }
  return Buffer.from(result.data);
}

async function markAvatarNonReadable(ownerId: string) {
  return upsertProfile(ownerId, {
    avatar_state: "purge_pending",
    avatar_content_type: null,
    avatar_size_bytes: null,
    avatar_width: null,
    avatar_height: null,
    avatar_updated_at: null,
  });
}

async function settleAvatarNone(ownerId: string) {
  return upsertProfile(ownerId, {
    avatar_state: "none",
    avatar_content_type: null,
    avatar_size_bytes: null,
    avatar_width: null,
    avatar_height: null,
    avatar_updated_at: null,
  });
}

async function purgeAvatarObject(ownerId: string) {
  const key = accountProfileAvatarKey(ownerId);
  await deleteR2Object(key);
  if (await r2ObjectExists(key)) throw new Error("avatar_storage_residue");
}

export async function replaceRenderLabAccountAvatar(
  ownerId: string,
  source: { bytes: Uint8Array; contentType: string; crop?: Partial<RenderLabAvatarCrop> | null },
) {
  await assertProfileMutationAllowed(ownerId);
  const normalized = await normalizeAvatarSource(source.bytes, source.contentType, source.crop);
  await markAvatarNonReadable(ownerId);

  try {
    await purgeAvatarObject(ownerId);
    const key = accountProfileAvatarKey(ownerId);
    await writeR2Object({ key, contentType: AVATAR_CONTENT_TYPE, body: normalized });
    const stored = await headR2Object(key);
    if (
      stored.contentType !== AVATAR_CONTENT_TYPE
      || stored.sizeBytes <= 0
    ) {
      throw new Error("avatar_storage_verification_failed");
    }

    const now = new Date().toISOString();
    const row = await upsertProfile(ownerId, {
      avatar_state: "active",
      avatar_content_type: AVATAR_CONTENT_TYPE,
      avatar_size_bytes: stored.sizeBytes,
      avatar_width: AVATAR_OUTPUT_SIZE,
      avatar_height: AVATAR_OUTPUT_SIZE,
      avatar_updated_at: now,
    });
    return publicProfile(row);
  } catch (error) {
    try {
      await purgeAvatarObject(ownerId);
      await settleAvatarNone(ownerId);
    } catch {
      await markAvatarNonReadable(ownerId).catch(() => null);
    }
    throw error;
  }
}

export async function removeRenderLabAccountAvatar(ownerId: string) {
  await assertProfileMutationAllowed(ownerId);
  const existing = await getRenderLabAccountProfileRow(ownerId);
  if (!existing || existing.avatar_state === "none") return publicProfile(existing);

  await markAvatarNonReadable(ownerId);
  try {
    await purgeAvatarObject(ownerId);
    return publicProfile(await settleAvatarNone(ownerId));
  } catch {
    throw new Error("avatar_purge_pending");
  }
}

export async function getRenderLabAccountAvatarReadUrl(ownerId: string) {
  const row = await getRenderLabAccountProfileRow(ownerId);
  if (!row || row.avatar_state !== "active") return null;
  const key = accountProfileAvatarKey(ownerId);
  if (!(await r2ObjectExists(key))) return null;
  return createSignedReadUrl(key, 60);
}

export async function runAccountAvatarPurgeMaintenance(limit = 4): Promise<AccountAvatarMaintenanceResult> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 8);
  const rows = await supabaseRest<Array<{ owner_id: string }>>(
    `renderlab_account_profiles?avatar_state=eq.purge_pending&select=owner_id&order=updated_at.asc,owner_id.asc&limit=${safeLimit}`,
  );
  let settled = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await purgeAvatarObject(row.owner_id);
      await settleAvatarNone(row.owner_id);
      settled += 1;
    } catch {
      failed += 1;
    }
  }
  return { scanned: rows.length, settled, failed };
}

export const renderLabAccountProfilePolicy = {
  displayNameMaxCodePoints: PROFILE_DISPLAY_NAME_MAX_CODE_POINTS,
  avatarMaxSourceBytes: AVATAR_MAX_SOURCE_BYTES,
  avatarMinDimension: AVATAR_MIN_DIMENSION,
  avatarMaxDimension: AVATAR_MAX_DIMENSION,
  avatarOutputSize: AVATAR_OUTPUT_SIZE,
  avatarInputTypes: Array.from(AVATAR_ALLOWED_INPUT_TYPES),
};
