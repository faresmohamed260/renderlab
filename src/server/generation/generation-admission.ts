import type { SubmitGenerationError } from "@/lib/api/generation-contract";
import { supabaseRest } from "@/server/data/supabase-rest";

type ReservationRow = {
  reservation_id: string;
  effective_generation_enabled: boolean;
  effective_max_active_jobs: number;
  effective_max_jobs_per_hour: number;
};

export type GenerationAdmissionReservation = {
  id: string;
};

export type GenerationAdmissionResult =
  | { ok: true; reservation: GenerationAdmissionReservation }
  | SubmitGenerationError;

function admissionError(code: SubmitGenerationError["error"]["code"], message: string): SubmitGenerationError {
  return { ok: false, error: { code, message } };
}

function classifyAdmissionError(error: unknown): SubmitGenerationError {
  const message = String(error);
  if (message.includes("renderlab_generation_access_denied")) {
    return admissionError("generation_access_denied", "This account does not currently have access to RenderLab generation.");
  }
  if (message.includes("renderlab_generation_disabled")) {
    return admissionError("generation_disabled", "Generation is temporarily paused for this account.");
  }
  if (message.includes("renderlab_generation_active_limit_reached")) {
    return admissionError("generation_active_limit_reached", "This account already has the maximum number of active generations. Try again after one finishes.");
  }
  if (message.includes("renderlab_generation_rate_limit_reached")) {
    return admissionError("generation_rate_limit_reached", "This account has reached its rolling generation limit. Try again later.");
  }
  return admissionError("generation_backend_unavailable", "Generation admission is temporarily unavailable.");
}

export async function reserveGenerationAdmission(ownerId: string): Promise<GenerationAdmissionResult> {
  try {
    const rows = await supabaseRest<ReservationRow[]>("rpc/renderlab_reserve_generation_admission", {
      method: "POST",
      body: JSON.stringify({ p_owner_id: ownerId }),
    });
    const row = rows?.[0];
    if (!row?.reservation_id) {
      return admissionError("generation_backend_unavailable", "Generation admission is temporarily unavailable.");
    }
    return { ok: true, reservation: { id: row.reservation_id } };
  } catch (error) {
    return classifyAdmissionError(error);
  }
}

export async function bindGenerationAdmission(
  ownerId: string,
  reservationId: string,
  jobId: string,
): Promise<boolean> {
  try {
    return await supabaseRest<boolean>("rpc/renderlab_bind_generation_admission", {
      method: "POST",
      body: JSON.stringify({
        p_owner_id: ownerId,
        p_reservation_id: reservationId,
        p_job_id: jobId,
      }),
    });
  } catch {
    return false;
  }
}

export async function releaseGenerationAdmission(ownerId: string, reservationId: string): Promise<boolean> {
  try {
    return await supabaseRest<boolean>("rpc/renderlab_release_generation_admission", {
      method: "POST",
      body: JSON.stringify({
        p_owner_id: ownerId,
        p_reservation_id: reservationId,
      }),
    });
  } catch {
    return false;
  }
}

export async function releaseBoundGenerationAdmission(ownerId: string, jobId: string): Promise<boolean> {
  try {
    const releasedAt = new Date().toISOString();
    const rows = await supabaseRest<Array<{ id: string }>>(
      `generation_admission_reservations?owner_id=eq.${encodeURIComponent(ownerId)}&job_id=eq.${encodeURIComponent(jobId)}&released_at=is.null&select=id`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ released_at: releasedAt }),
      },
    );
    return Boolean(rows?.length);
  } catch {
    return false;
  }
}
