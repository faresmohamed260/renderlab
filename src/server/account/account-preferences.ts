import {
  defaultVideoAudioEnabled,
  defaultVideoResolution,
  imageAspectRatios,
  videoDurations,
  videoResolutions,
  type OutputKind,
  type PresetAspectRatio,
  type VideoResolution,
} from "@/lib/capabilities/generation";
import { supabaseRest } from "@/server/data/supabase-rest";

export type RenderLabCreatePreferences = {
  outputKind: OutputKind;
  imageAspectRatio: PresetAspectRatio;
  videoResolution: VideoResolution;
  videoDurationSeconds: (typeof videoDurations)[number];
  videoAudioEnabled: boolean;
};

export type RenderLabAccountPreferences = {
  source: "saved" | "product-defaults";
  create: RenderLabCreatePreferences;
  updatedAt: string | null;
};

export type RenderLabAccountPreferencesRow = {
  owner_id: string;
  create_output_kind: string;
  create_image_aspect_ratio: string;
  create_video_resolution: string;
  create_video_duration_seconds: number;
  create_video_audio_enabled: boolean;
  created_at: string;
  updated_at: string;
};

const productCreateDefaults: RenderLabCreatePreferences = {
  outputKind: "image",
  imageAspectRatio: "1:1",
  videoResolution: defaultVideoResolution,
  videoDurationSeconds: 5,
  videoAudioEnabled: defaultVideoAudioEnabled,
};

function isOutputKind(value: unknown): value is OutputKind {
  return value === "image" || value === "video";
}

function isImageAspectRatio(value: unknown): value is PresetAspectRatio {
  return typeof value === "string" && imageAspectRatios.includes(value as PresetAspectRatio);
}

function isVideoResolution(value: unknown): value is VideoResolution {
  return typeof value === "string" && videoResolutions.includes(value as VideoResolution);
}

function isVideoDuration(value: unknown): value is (typeof videoDurations)[number] {
  return typeof value === "number" && videoDurations.includes(value as (typeof videoDurations)[number]);
}

function publicPreferences(row: RenderLabAccountPreferencesRow | null): RenderLabAccountPreferences {
  if (!row) {
    return { source: "product-defaults", create: { ...productCreateDefaults }, updatedAt: null };
  }

  return {
    source: "saved",
    create: {
      outputKind: isOutputKind(row.create_output_kind) ? row.create_output_kind : productCreateDefaults.outputKind,
      imageAspectRatio: isImageAspectRatio(row.create_image_aspect_ratio)
        ? row.create_image_aspect_ratio
        : productCreateDefaults.imageAspectRatio,
      videoResolution: isVideoResolution(row.create_video_resolution)
        ? row.create_video_resolution
        : productCreateDefaults.videoResolution,
      videoDurationSeconds: isVideoDuration(row.create_video_duration_seconds)
        ? row.create_video_duration_seconds
        : productCreateDefaults.videoDurationSeconds,
      videoAudioEnabled: typeof row.create_video_audio_enabled === "boolean"
        ? row.create_video_audio_enabled
        : productCreateDefaults.videoAudioEnabled,
    },
    updatedAt: row.updated_at,
  };
}

function parseCreatePreferences(value: unknown): RenderLabCreatePreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("account_preferences_invalid");
  const record = value as Record<string, unknown>;
  const allowed = new Set([
    "outputKind",
    "imageAspectRatio",
    "videoResolution",
    "videoDurationSeconds",
    "videoAudioEnabled",
  ]);
  if (Object.keys(record).length !== allowed.size || Object.keys(record).some((key) => !allowed.has(key))) {
    throw new Error("account_preferences_invalid");
  }
  if (
    !isOutputKind(record.outputKind)
    || !isImageAspectRatio(record.imageAspectRatio)
    || !isVideoResolution(record.videoResolution)
    || !isVideoDuration(record.videoDurationSeconds)
    || typeof record.videoAudioEnabled !== "boolean"
  ) {
    throw new Error("account_preferences_invalid");
  }
  return {
    outputKind: record.outputKind,
    imageAspectRatio: record.imageAspectRatio,
    videoResolution: record.videoResolution,
    videoDurationSeconds: record.videoDurationSeconds,
    videoAudioEnabled: record.videoAudioEnabled,
  };
}

async function assertPreferenceMutationAllowed(ownerId: string) {
  const rows = await supabaseRest<Array<{ user_id: string }>>(
    `renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(ownerId)}&state=eq.deleting&select=user_id&limit=1`,
  );
  if (rows.length) throw new Error("account_deletion_in_progress");
}

export async function getRenderLabAccountPreferencesRow(ownerId: string) {
  const rows = await supabaseRest<RenderLabAccountPreferencesRow[]>(
    `renderlab_account_preferences?owner_id=eq.${encodeURIComponent(ownerId)}&select=*&limit=1`,
  );
  return rows[0] ?? null;
}

export async function getRenderLabAccountPreferences(ownerId: string) {
  return publicPreferences(await getRenderLabAccountPreferencesRow(ownerId));
}

export async function updateRenderLabAccountPreferences(ownerId: string, value: unknown) {
  await assertPreferenceMutationAllowed(ownerId);
  const create = parseCreatePreferences(value);
  const rows = await supabaseRest<RenderLabAccountPreferencesRow[]>(
    "renderlab_account_preferences?on_conflict=owner_id&select=*",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        owner_id: ownerId,
        create_output_kind: create.outputKind,
        create_image_aspect_ratio: create.imageAspectRatio,
        create_video_resolution: create.videoResolution,
        create_video_duration_seconds: create.videoDurationSeconds,
        create_video_audio_enabled: create.videoAudioEnabled,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!rows[0]) throw new Error("account_preferences_unavailable");
  return publicPreferences(rows[0]);
}

export async function resetRenderLabAccountPreferences(ownerId: string) {
  await assertPreferenceMutationAllowed(ownerId);
  await supabaseRest(`renderlab_account_preferences?owner_id=eq.${encodeURIComponent(ownerId)}`, {
    method: "DELETE",
  });
  return publicPreferences(null);
}

export const renderLabAccountPreferenceOptions = {
  outputKinds: ["image", "video"] as const,
  imageAspectRatios,
  videoResolutions,
  videoDurations,
};
