import { randomUUID } from "node:crypto";
import type { GenerationJob, GenerationRequest } from "@/lib/capabilities/generation";
import { resolveCreativeOperation } from "@/lib/capabilities/generation";
import type { SubmitGenerationResponse } from "@/lib/api/generation-contract";
import { supabaseRest } from "@/server/data/supabase-rest";
import { putR2Object } from "@/server/storage/r2";

type SourceRow = {
  id: string;
  storage_key: string;
  filename: string;
  mime_type: string;
  status: "pending" | "ready" | "failed";
};

type SagaJob = {
  id?: unknown;
  status?: unknown;
  created_at?: unknown;
  started_at?: unknown;
  completed_at?: unknown;
};

const placeholderPngByAspect: Record<GenerationRequest["output"]["aspectRatio"], string> = {
  "1:1": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAATUlEQVR42u3PQQ0AAAgEIDX5RTeFDzdoQCepz6aeExAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQELi3oiwCAJt186UAAAAASUVORK5CYII=",
  "16:9": "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAkCAIAAAC2bqvFAAAAOElEQVR42u3PAQkAAAgDMDX5o9tCELYG6yT12dRzAgICAgICAgICAgICAgICAgICAgICAgICAtcWocgByASwAXoAAAAASUVORK5CYII=",
  "9:16": "iVBORw0KGgoAAAANSUhEUgAAACQAAABACAIAAAD9B0KDAAAANklEQVR42u3NMQEAAAgDIDX5opvBxwsK0Enqy9QjmUwmk8lkMplMJpPJZDKZTCaTyWQymexuAcsBAgBVGKzYAAAAAElFTkSuQmCC",
  "4:3": "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAQUlEQVR42u3PAQkAAAgDMDX5o9tCELYG6yT12dRzAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAncWNcMB4HW5EbYAAAAASUVORK5CYII=",
  "3:4": "iVBORw0KGgoAAAANSUhEUgAAADAAAABACAIAAADTQmMRAAAAQUlEQVR42u3OAQ0AAAgDIDX5o1vDOUhAJ6lLpo4REhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhIS+htalPECAL3e2B0AAAAASUVORK5CYII=",
};

function nowSourceKey() {
  const now = new Date();
  return `sources/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.png`;
}

async function resolveTemporarySources(request: GenerationRequest) {
  const ids = request.inputs
    .filter((input) => input.source.type === "temporary-source")
    .map((input) => input.source.id);

  if (request.inputs.some((input) => input.source.type === "media-asset")) {
    throw new Error("Media-asset generation inputs are not connected yet.");
  }
  if (!ids.length) return [] as SourceRow[];

  const rows = await supabaseRest<SourceRow[]>(
    `generation_sources?id=in.(${ids.map((id) => `\"${id}\"`).join(",")})&select=id,storage_key,filename,mime_type,status`,
    { method: "GET" },
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = ids.map((id) => byId.get(id)).filter((row): row is SourceRow => Boolean(row));
  if (ordered.length !== ids.length || ordered.some((row) => row.status !== "ready")) {
    throw new Error("One or more reference sources are not ready.");
  }
  return ordered;
}

async function createTextImageSource(request: GenerationRequest): Promise<SourceRow> {
  const storageKey = nowSourceKey();
  const bytes = Buffer.from(placeholderPngByAspect[request.output.aspectRatio], "base64");
  await putR2Object({ key: storageKey, contentType: "image/png", body: bytes });
  return {
    id: "synthetic",
    storage_key: storageKey,
    filename: "renderlab-text-generation-canvas.png",
    mime_type: "image/png",
    status: "ready",
  };
}

function workflowFor(request: GenerationRequest) {
  const operation = resolveCreativeOperation(request);
  if (operation === "create-image") return "flux2-klein-image-generate";
  if (operation === "edit-image") return "flux2-klein-image-edit";
  return "ltx25-redgraft-video";
}

function mapSagaJob(value: SagaJob, request: GenerationRequest): GenerationJob | null {
  if (typeof value.id !== "string" || !value.id) return null;
  const createdAt = typeof value.created_at === "string" ? value.created_at : new Date().toISOString();
  const updatedAt = typeof value.started_at === "string"
    ? value.started_at
    : typeof value.completed_at === "string"
      ? value.completed_at
      : createdAt;
  return {
    id: value.id,
    status: "running",
    operation: resolveCreativeOperation(request),
    createdAt,
    updatedAt,
    outputAssetIds: [],
  };
}

export async function submitThroughStudioCompatibility(
  request: GenerationRequest,
  studioBaseUrl: string,
): Promise<SubmitGenerationResponse> {
  try {
    let sources = await resolveTemporarySources(request);
    if (resolveCreativeOperation(request) === "create-image") {
      sources = [await createTextImageSource(request)];
    }

    const body = {
      workflowId: workflowFor(request),
      prompt: request.prompt,
      negativePrompt: request.advanced?.negativePrompt ?? "",
      seed: request.advanced?.seed ?? 42,
      steps: request.advanced?.steps,
      cfg: request.advanced?.guidance,
      megapixels: 1,
      aspectRatio: request.output.aspectRatio,
      durationSeconds: request.output.kind === "video" ? request.output.durationSeconds : undefined,
      resolution: request.output.kind === "video" ? "480p" : "Auto",
      audioEnabled: request.output.kind === "video" ? true : undefined,
      frameRate: request.output.kind === "video" ? request.advanced?.frameRate ?? 24 : undefined,
      sourceKeys: sources.map((source) => source.storage_key),
      sourceFilenames: sources.map((source) => source.filename),
      sourceContentTypes: sources.map((source) => source.mime_type),
    };

    const response = await fetch(`${studioBaseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null) as { job?: SagaJob; error?: string } | null;
    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: "generation_submission_failed",
          message: payload?.error || `Studio compatibility generation failed (${response.status}).`,
        },
      };
    }

    const job = payload?.job ? mapSagaJob(payload.job, request) : null;
    if (!job) {
      return {
        ok: false,
        error: {
          code: "generation_submission_failed",
          message: "Studio compatibility generation returned an invalid job.",
        },
      };
    }

    return { ok: true, job };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "generation_backend_unavailable",
        message: error instanceof Error ? error.message : "Studio compatibility generation could not be reached.",
      },
    };
  }
}
