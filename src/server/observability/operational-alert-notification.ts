import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import { supabaseRest } from "@/server/data/supabase-rest";
import type { OperationalAlertRow } from "@/server/observability/diagnostic-store";
import { fanoutOperationalAlertNotification, operationalAlertEmailContent } from "@/server/observability/operational-alerts";

const operationalAlertSender = "RenderLab Operations <security@mail.renderlab.faresuniform.uk>";
const adminRecipientLimit = 20;

type AdminAccessRow = { user_id: string };
type ResendSendResponse = { id?: unknown };

export type OperationalAlertNotificationResult = {
  attempted: number;
  accepted: number;
  failed: number;
};

type OperationalAlertNotificationDependencies = {
  resolveRecipients?: () => Promise<string[]>;
  sendEmail?: (email: string, alert: OperationalAlertRow) => Promise<boolean>;
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

async function activeAdminEmails() {
  const client = serviceRoleClient();
  if (!client) return [];
  const params = new URLSearchParams({
    role: "eq.admin",
    status: "eq.active",
    select: "user_id",
    order: "created_at.asc,user_id.asc",
    limit: String(adminRecipientLimit),
  });
  const rows = await supabaseRest<AdminAccessRow[]>(`renderlab_account_access?${params.toString()}`);
  const emails: string[] = [];
  for (const row of rows) {
    const { data, error } = await client.auth.admin.getUserById(row.user_id);
    const email = data.user?.email;
    if (error || typeof email !== "string" || !email || !data.user?.email_confirmed_at) continue;
    emails.push(email);
  }
  return Array.from(new Set(emails));
}

async function sendOneOperationalAlert(email: string, alert: OperationalAlertRow) {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) return false;
  const content = operationalAlertEmailContent({
    family: alert.family,
    severity: alert.severity,
    firstSeenAt: alert.first_seen_at,
    lastSeenAt: alert.last_seen_at,
    occurrenceCount: Number(alert.occurrence_count),
  });
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        from: operationalAlertSender,
        to: [email],
        subject: content.subject,
        html: content.html,
      }),
    });
    if (!response.ok) return false;
    const payload = await response.json().catch(() => null) as ResendSendResponse | null;
    return typeof payload?.id === "string" && payload.id.length > 0;
  } catch {
    return false;
  }
}

export async function sendOperationalAlertNotification(
  alert: OperationalAlertRow,
  dependencies: OperationalAlertNotificationDependencies = {},
): Promise<OperationalAlertNotificationResult> {
  const resolveRecipients = dependencies.resolveRecipients ?? activeAdminEmails;
  const sendEmail = dependencies.sendEmail ?? sendOneOperationalAlert;
  const recipients = await resolveRecipients().catch(() => []);
  return fanoutOperationalAlertNotification(alert, recipients, sendEmail);
}
