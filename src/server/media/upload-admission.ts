import { supabaseRest } from "@/server/data/supabase-rest";

export type UploadAdmissionKind = "media" | "reference";
export type UploadAdmissionLimitCode = "upload_active_limit_reached" | "upload_rate_limit_reached";

type ReservationRow = {
  reservation_id: string;
  effective_max_active_uploads: number;
  effective_max_uploads_per_hour: number;
};

export type UploadAdmissionReservation = {
  id: string;
  kind: UploadAdmissionKind;
};

export class UploadAdmissionLimitError extends Error {
  readonly code: UploadAdmissionLimitCode;

  constructor(code: UploadAdmissionLimitCode, message: string) {
    super(message);
    this.name = "UploadAdmissionLimitError";
    this.code = code;
  }
}

function classifyAdmissionFailure(error: unknown): never {
  const message = String(error);
  if (message.includes("renderlab_upload_active_limit_reached")) {
    throw new UploadAdmissionLimitError(
      "upload_active_limit_reached",
      "This account already has the maximum number of uploads in progress. Finish or retry an existing upload before starting another.",
    );
  }
  if (message.includes("renderlab_upload_rate_limit_reached")) {
    throw new UploadAdmissionLimitError(
      "upload_rate_limit_reached",
      "This account has reached its rolling upload-ticket limit. Try again later.",
    );
  }
  throw error instanceof Error ? error : new Error("Upload admission is temporarily unavailable.");
}

export async function reserveUploadAdmission(
  ownerId: string,
  kind: UploadAdmissionKind,
): Promise<UploadAdmissionReservation> {
  try {
    const rows = await supabaseRest<ReservationRow[]>("rpc/renderlab_reserve_upload_admission", {
      method: "POST",
      body: JSON.stringify({
        p_owner_id: ownerId,
        p_upload_kind: kind,
      }),
    });
    const row = rows?.[0];
    if (!row?.reservation_id) throw new Error("Upload admission reservation was not created.");
    return { id: row.reservation_id, kind };
  } catch (error) {
    return classifyAdmissionFailure(error);
  }
}

export async function bindUploadAdmission(
  ownerId: string,
  reservation: UploadAdmissionReservation,
  resourceId: string,
): Promise<boolean> {
  try {
    return await supabaseRest<boolean>("rpc/renderlab_bind_upload_admission", {
      method: "POST",
      body: JSON.stringify({
        p_owner_id: ownerId,
        p_reservation_id: reservation.id,
        p_upload_kind: reservation.kind,
        p_resource_id: resourceId,
      }),
    });
  } catch {
    return false;
  }
}

export function injectUploadAdmissionSigningTestFault(kind: UploadAdmissionKind, filename: string) {
  if (process.env.RENDERLAB_TEST_UPLOAD_ADMISSION_FAULTS !== "true") return;
  if (filename !== `renderlab-ent004-${kind}-signing-fault.png`) return;
  throw new Error(`Injected ENT-004 ${kind} upload signing failure.`);
}

export async function releaseUploadAdmission(
  ownerId: string,
  reservationId: string,
): Promise<boolean> {
  try {
    return await supabaseRest<boolean>("rpc/renderlab_release_upload_admission", {
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
