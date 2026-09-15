import { createClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import { processAccountDeletion } from "@/server/account/account-data-lifecycle";
import { sendAccountDeletionNotification } from "@/server/account/account-deletion-notification";
import { supabaseRest } from "@/server/data/supabase-rest";

type NotificationLifecycleRow = {
  user_id: string;
  notification_state: "pending" | "accepted" | "failed";
};

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

async function pendingNotification(ownerId: string) {
  const rows = await supabaseRest<NotificationLifecycleRow[]>(
    `renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(ownerId)}&state=eq.deleting&select=user_id,notification_state&limit=1`,
  );
  return rows[0] ?? null;
}

async function notificationRecipient(ownerId: string) {
  const service = serviceRoleClient();
  if (!service) return null;
  const { data, error } = await service.auth.admin.getUserById(ownerId);
  if (error || data.user?.id !== ownerId || typeof data.user.email !== "string") return null;
  return data.user.email;
}

async function attemptPendingDeletionNotification(ownerId: string) {
  const lifecycle = await pendingNotification(ownerId).catch(() => null);
  if (!lifecycle || lifecycle.notification_state !== "pending") return;

  const email = await notificationRecipient(ownerId).catch(() => null);
  const result = email
    ? await sendAccountDeletionNotification(email)
    : { state: "failed" as const, errorCode: "account_deletion_mail_recipient_unavailable" };
  const attemptedAt = new Date().toISOString();

  await supabaseRest(
    `renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(ownerId)}&state=eq.deleting&notification_state=eq.pending`,
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

export async function processAccountDeletionWithNotification(ownerId: string) {
  await attemptPendingDeletionNotification(ownerId);
  return processAccountDeletion(ownerId);
}
