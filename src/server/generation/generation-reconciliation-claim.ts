import { supabaseRest } from "@/server/data/supabase-rest";

export const generationReconciliationLeaseSeconds = 600;

export async function claimGenerationReconciliation(ownerId: string, jobId: string, token: string) {
  return supabaseRest<boolean>("rpc/renderlab_claim_generation_reconciliation", {
    method: "POST",
    body: JSON.stringify({
      p_owner_id: ownerId,
      p_job_id: jobId,
      p_token: token,
      p_lease_seconds: generationReconciliationLeaseSeconds,
    }),
  });
}

export async function releaseGenerationReconciliation(ownerId: string, jobId: string, token: string) {
  try {
    return await supabaseRest<boolean>("rpc/renderlab_release_generation_reconciliation", {
      method: "POST",
      body: JSON.stringify({
        p_owner_id: ownerId,
        p_job_id: jobId,
        p_token: token,
      }),
    });
  } catch {
    return false;
  }
}
