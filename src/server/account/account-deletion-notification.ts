const deletionNoticeSubject = "Your RenderLab account deletion was accepted";
const deletionNoticeSender = "RenderLab Security <security@mail.renderlab.faresuniform.uk>";

type ResendSendResponse = { id?: unknown };

export type AccountDeletionNotificationResult =
  | { state: "accepted"; errorCode: null }
  | { state: "failed"; errorCode: string };

export async function sendAccountDeletionNotification(
  email: string,
): Promise<AccountDeletionNotificationResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return { state: "failed", errorCode: "account_deletion_mail_unconfigured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        from: deletionNoticeSender,
        to: [email],
        subject: deletionNoticeSubject,
        html: [
          "<p><strong>RenderLab security notice</strong></p>",
          "<p>Your irreversible RenderLab account deletion request was accepted.</p>",
          "<p>New creative work is blocked while RenderLab removes account-owned product data and media, then removes the sign-in identity last.</p>",
          "<p>Infrastructure providers may retain service logs according to their own retention policies.</p>",
          "<p>If you did not request this deletion, contact the RenderLab operator immediately.</p>",
        ].join(""),
      }),
    });
    if (!response.ok) {
      return { state: "failed", errorCode: "account_deletion_mail_send_failed" };
    }
    const payload = await response.json().catch(() => null) as ResendSendResponse | null;
    if (typeof payload?.id !== "string" || !payload.id) {
      return { state: "failed", errorCode: "account_deletion_mail_send_failed" };
    }
    return { state: "accepted", errorCode: null };
  } catch {
    return { state: "failed", errorCode: "account_deletion_mail_send_failed" };
  }
}
