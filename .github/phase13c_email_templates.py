import json
import os
import secrets
import ssl
import urllib.error
import urllib.parse
import urllib.request

PROJECT_REF = os.environ["SUPABASE_PROJECT_REF"]
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SITE_URL = os.environ["SITE_URL"].rstrip("/")
SENDER_DOMAIN = os.environ["SENDER_DOMAIN"]
FROM_EMAIL = os.environ["FROM_EMAIL"]
SMTP_HOST = os.environ["SMTP_HOST"]
SMTP_PORT = os.environ["SMTP_PORT"]
RATE = int(os.environ["AUTH_EMAIL_RATE_LIMIT"])
MGMT = os.environ["SUPABASE_ACCESS_TOKEN"]
SERVICE = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
RESEND = os.environ["RESEND_API_KEY"]
INVITE_SUBJECT = os.environ["INVITE_SUBJECT"]
RECOVERY_SUBJECT = os.environ["RECOVERY_SUBJECT"]
INVITE_REDIRECT = os.environ["INVITE_REDIRECT"]
RECOVERY_REDIRECT = os.environ["RECOVERY_REDIRECT"]

for name in ("SUPABASE_ACCESS_TOKEN", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY"):
    if not os.environ.get(name):
        raise SystemExit(f"{name}_PRESENT=false")
    print(f"{name}_PRESENT=true")

def request_json(url, *, method="GET", headers=None, body=None, expected=(200,)):
    data = None if body is None else json.dumps(body).encode()
    h = {"Accept": "application/json", **(headers or {})}
    if body is not None:
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context()) as res:
            payload = res.read().decode()
            status = res.status
    except urllib.error.HTTPError as e:
        payload = e.read().decode(errors="replace")
        raise RuntimeError(f"{method} {url} -> {e.code}: {payload[:500]}") from None
    if status not in expected:
        raise RuntimeError(f"{method} {url} -> {status}")
    return json.loads(payload) if payload else {}

resend_headers = {"Authorization": f"Bearer {RESEND}"}
domains = request_json("https://api.resend.com/domains", headers=resend_headers)
exact = [r for r in domains.get("data", []) if str(r.get("name") or "").lower().rstrip(".") == SENDER_DOMAIN.lower().rstrip(".")]
if len(exact) != 1:
    raise SystemExit(f"Expected one exact Resend domain, got {len(exact)}")
domain = request_json(f"https://api.resend.com/domains/{exact[0]['id']}", headers=resend_headers)
if domain.get("status") != "verified":
    raise SystemExit("Resend domain is not verified")
if domain.get("open_tracking") is not False or domain.get("click_tracking") is not False:
    raise SystemExit("Resend tracking is not disabled")
print("RESEND_DOMAIN_VERIFIED=true")
print("RESEND_OPEN_TRACKING=false")
print("RESEND_CLICK_TRACKING=false")

mgmt_endpoint = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/config/auth"
mgmt_headers = {"Authorization": f"Bearer {MGMT}", "User-Agent": "RenderLab-Phase13C-Templates/1.1"}
before = request_json(mgmt_endpoint, headers=mgmt_headers)
if before.get("site_url") != SITE_URL:
    raise SystemExit("Unexpected Site URL")
if str(before.get("smtp_host") or "") != SMTP_HOST:
    raise SystemExit("Unexpected SMTP host")
if str(before.get("smtp_port")) != SMTP_PORT:
    raise SystemExit("Unexpected SMTP port")
if str(before.get("smtp_admin_email") or "") != FROM_EMAIL:
    raise SystemExit("Unexpected From identity")
if int(before.get("rate_limit_email_sent") or -1) != RATE:
    raise SystemExit("Unexpected email rate limit")
allow = before.get("uri_allow_list")
allow = [x.strip() for x in allow.split(",")] if isinstance(allow, str) else list(allow or [])
for required in (INVITE_REDIRECT, RECOVERY_REDIRECT):
    if required not in allow:
        raise SystemExit("Required production redirect missing")
print("SUPABASE_RESEND_SMTP_BASELINE_OK=true")
print("SUPABASE_REQUIRED_REDIRECTS_PRESERVED=true")
print("INVITE_TEMPLATE_CONFIRMATION_URL_BEFORE=" + str("{{ .ConfirmationURL }}" in str(before.get("mailer_templates_invite_content") or "")).lower())
print("RECOVERY_TEMPLATE_CONFIRMATION_URL_BEFORE=" + str("{{ .ConfirmationURL }}" in str(before.get("mailer_templates_recovery_content") or "")).lower())

mark_req = urllib.request.Request(f"{SITE_URL}/renderlab-mark.svg", headers={"User-Agent": "RenderLab-Phase13C/1.1"})
with urllib.request.urlopen(mark_req, timeout=30, context=ssl.create_default_context()) as res:
    mark = res.read().decode()
    content_type = res.headers.get("content-type", "")
if "<svg" not in mark or "svg" not in content_type.lower():
    raise SystemExit("Approved RenderLab mark is not reachable as SVG")
print("RENDERLAB_EMAIL_MARK_REACHABLE=true")

invite_url = "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/settings"
recovery_url = "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/settings/password"

def email_shell(*, eyebrow, title, lead, cta, url, security):
    safe_url = url.replace("&", "&amp;")
    return f"""<!doctype html>
<html>
<body style="margin:0;padding:0;background:#090a0c;color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#090a0c;margin:0;padding:0;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;background:#111318;border:1px solid #2b303a;border-radius:20px;overflow:hidden;">
<tr><td style="height:5px;background:#7c6cf2;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:30px 32px 10px 32px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td valign="middle" style="padding-right:12px;"><img src="{{{{ .SiteURL }}}}/renderlab-mark.svg" width="42" height="42" alt="RenderLab logo" style="display:block;width:42px;height:42px;border:0;outline:none;text-decoration:none;border-radius:11px;" /></td>
<td valign="middle" style="font-size:20px;line-height:26px;font-weight:700;letter-spacing:-0.3px;color:#f4f5f7;">RenderLab</td>
</tr></table>
</td></tr>
<tr><td style="padding:24px 32px 32px 32px;">
<div style="font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:#9ca3af;">{eyebrow}</div>
<h1 style="margin:10px 0 14px 0;font-size:30px;line-height:37px;font-weight:700;letter-spacing:-0.7px;color:#f4f5f7;">{title}</h1>
<p style="margin:0 0 24px 0;font-size:16px;line-height:25px;color:#c7cbd2;">{lead}</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 26px 0;"><tr>
<td bgcolor="#7c6cf2" style="border-radius:10px;background:#7c6cf2;"><a href="{safe_url}" style="display:inline-block;padding:13px 20px;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">{cta}</a></td>
</tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#171a20;border:1px solid #2b303a;border-radius:12px;"><tr>
<td style="padding:15px 16px;font-size:13px;line-height:20px;color:#9ca3af;">{security}</td>
</tr></table>
<p style="margin:24px 0 7px 0;font-size:12px;line-height:18px;color:#737b88;">If the button does not work, copy and paste this secure link into your browser:</p>
<p style="margin:0;font-size:12px;line-height:18px;word-break:break-all;color:#a9a2ff;"><a href="{safe_url}" style="color:#a9a2ff;text-decoration:underline;word-break:break-all;">{safe_url}</a></p>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #2b303a;font-size:12px;line-height:18px;color:#737b88;">RenderLab &nbsp;&middot;&nbsp; Secure account email<br />This automated message contains no marketing or tracking links.</td></tr>
</table>
</td></tr></table>
</body>
</html>"""

invite = email_shell(
    eyebrow="Private beta invitation",
    title="Your RenderLab invitation is ready",
    lead="You have been invited to join RenderLab. Accept the invitation to finish setting up your account and enter the private beta.",
    cta="Accept invitation",
    url=invite_url,
    security="This invitation is intended only for the recipient. The secure link is time-limited and can only be used once. If you were not expecting this invitation, you can ignore this email.",
)
recovery = email_shell(
    eyebrow="Account security",
    title="Reset your RenderLab password",
    lead="We received a request to reset the password for your RenderLab account. Use the secure link below to choose a new password.",
    cta="Reset password",
    url=recovery_url,
    security="For your security, this reset link is time-limited and can only be used once. If you did not request a password reset, you can safely ignore this email.",
)

patch = {
    "mailer_subjects_invite": INVITE_SUBJECT,
    "mailer_templates_invite_content": invite,
    "mailer_subjects_recovery": RECOVERY_SUBJECT,
    "mailer_templates_recovery_content": recovery,
}
request_json(mgmt_endpoint, method="PATCH", headers=mgmt_headers, body=patch)
print("SUPABASE_TEMPLATE_PATCH_HTTP=200")

after = request_json(mgmt_endpoint, headers=mgmt_headers)
invite_stored = str(after.get("mailer_templates_invite_content") or "")
recovery_stored = str(after.get("mailer_templates_recovery_content") or "")
if after.get("mailer_subjects_invite") != INVITE_SUBJECT:
    raise SystemExit("Invite subject mismatch")
if after.get("mailer_subjects_recovery") != RECOVERY_SUBJECT:
    raise SystemExit("Recovery subject mismatch")
expected_invite = "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite&amp;next=/settings"
expected_recovery = "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/settings/password"
for name, body, expected in (
    ("invite", invite_stored, expected_invite),
    ("recovery", recovery_stored, expected_recovery),
):
    if expected not in body:
        raise SystemExit(f"{name} exact token-hash URL missing")
    if "{{ .ConfirmationURL }}" in body:
        raise SystemExit(f"{name} still contains ConfirmationURL")
    if "{{ .TokenHash }}" not in body or "{{ .SiteURL }}" not in body:
        raise SystemExit(f"{name} token variables missing")
    if "{{ .SiteURL }}/renderlab-mark.svg" not in body:
        raise SystemExit(f"{name} approved brand mark missing")
    lowered = body.lower()
    for forbidden in ("resend.com", "brevo.com", "supabase.co/auth/v1/verify"):
        if forbidden in lowered:
            raise SystemExit(f"{name} contains forbidden provider link")
    for required in ("RenderLab", 'role="presentation"', "#7c6cf2", "copy and paste this secure link"):
        if required not in body:
            raise SystemExit(f"{name} shell requirement missing: {required}")

if str(after.get("smtp_host") or "") != SMTP_HOST or str(after.get("smtp_port")) != SMTP_PORT:
    raise SystemExit("SMTP changed during template patch")
if str(after.get("smtp_admin_email") or "") != FROM_EMAIL:
    raise SystemExit("From changed during template patch")
if int(after.get("rate_limit_email_sent") or -1) != RATE:
    raise SystemExit("Rate limit changed during template patch")
if after.get("site_url") != SITE_URL:
    raise SystemExit("Site URL changed during template patch")
print("INVITE_TEMPLATE_READBACK_OK=true")
print("RECOVERY_TEMPLATE_READBACK_OK=true")
print("CONFIRMATION_URL_REMOVED=true")
print("TOKEN_HASH_LINK_CONTRACT_OK=true")
print("RENDERLAB_EMAIL_SHELL_OK=true")
print("SUPABASE_RESEND_SMTP_PRESERVED=true")

auth_headers = {
    "apikey": SERVICE,
    "Authorization": f"Bearer {SERVICE}",
}
run = f"{os.environ.get('GITHUB_RUN_ID','manual')}-{os.environ.get('GITHUB_RUN_ATTEMPT','1')}"
invite_email = f"renderlab-phase13c-invite-{run}@example.com"
recovery_email = f"renderlab-phase13c-recovery-{run}@example.com"
owned = set()
try:
    inv = request_json(
        f"{SUPABASE_URL}/auth/v1/admin/generate_link",
        method="POST", headers=auth_headers,
        body={"type": "invite", "email": invite_email},
    )
    invite_user = (inv.get("user") or {}).get("id")
    if invite_user:
        owned.add(invite_user)
    if not inv.get("hashed_token") or not inv.get("action_link"):
        raise SystemExit("Invite generate_link missing token properties")

    recovery_user = request_json(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        method="POST", headers=auth_headers,
        body={
            "email": recovery_email,
            "password": secrets.token_urlsafe(32) + "!Aa9",
            "email_confirm": True,
        },
    )
    rid = recovery_user.get("id")
    if not rid:
        raise SystemExit("Recovery fixture user missing")
    owned.add(rid)
    rec = request_json(
        f"{SUPABASE_URL}/auth/v1/admin/generate_link",
        method="POST", headers=auth_headers,
        body={"type": "recovery", "email": recovery_email},
    )
    if not rec.get("hashed_token") or not rec.get("action_link"):
        raise SystemExit("Recovery generate_link missing token properties")
    for name, result in (("invite", inv), ("recovery", rec)):
        action = str(result.get("action_link") or "")
        if not action.startswith(f"{SUPABASE_URL}/auth/v1/verify?"):
            raise SystemExit(f"{name} unexpected generated action-link origin")
    print("SUPABASE_GENERATE_LINK_INVITE_OK=true")
    print("SUPABASE_GENERATE_LINK_RECOVERY_OK=true")
    print("SUPABASE_GENERATE_LINK_SENT_EMAIL=false")
finally:
    for uid in owned:
        try:
            request_json(f"{SUPABASE_URL}/auth/v1/admin/users/{uid}", method="DELETE", headers=auth_headers, expected=(200, 204))
        except Exception as e:
            print(f"PHASE13C_CLEANUP_ERROR={type(e).__name__}")
            raise

for email in (invite_email, recovery_email):
    data = request_json(
        f"{SUPABASE_URL}/auth/v1/admin/users?filter={urllib.parse.quote(email)}&page=1&per_page=50",
        headers=auth_headers,
    )
    users = data.get("users") or []
    if any((u.get("email") or "").lower() == email.lower() for u in users):
        raise SystemExit("Phase 13C Auth fixture cleanup failed")
print("PHASE13C_AUTH_FIXTURE_RESIDUE=0")

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirect)
tests = [
    f"{SITE_URL}/auth/confirm?token_hash=invalid-phase13c&type=invite&next=https://evil.example",
    f"{SITE_URL}/auth/confirm?token_hash=invalid-phase13c&type=recovery&next=https://evil.example",
    f"{SITE_URL}/auth/confirm?token_hash=invalid-phase13c&type=magiclink&next=https://evil.example",
]
for test_url in tests:
    req = urllib.request.Request(test_url, headers={"User-Agent":"RenderLab-Phase13C/1.1"})
    try:
        opener.open(req, timeout=30)
        raise SystemExit("Invalid auth link unexpectedly did not redirect")
    except urllib.error.HTTPError as e:
        if e.code != 307:
            raise SystemExit(f"Invalid auth link returned {e.code}, expected 307")
        location = e.headers.get("Location", "")
        if location != "/settings?auth=link_invalid" or "evil.example" in location:
            raise SystemExit(f"Unexpected fail-closed Location: {location}")
print("PRODUCTION_INVALID_AUTH_LINKS_FAIL_CLOSED=true")
print("PRODUCTION_HOSTILE_NEXT_REJECTED=true")
print("PHASE13C_REAL_AUTH_EMAIL_SENT=false")
