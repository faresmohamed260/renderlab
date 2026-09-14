import hashlib
import json
import os
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PROJECT_REF = os.environ["SUPABASE_PROJECT_REF"]
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
PUBLISHABLE_KEY = os.environ["SUPABASE_PUBLISHABLE_KEY"]
SERVICE_ROLE = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ACCESS_TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]
EXPECTED_SITE_URL = os.environ["EXPECTED_SITE_URL"]
EXPECTED_URI_ALLOW_LIST = os.environ["EXPECTED_URI_ALLOW_LIST"]
MANAGEMENT_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/config/auth"
PATCH = json.loads(Path("ops/account-auth-hardening-215a-patch.json").read_text())
ARTIFACTS = Path("artifacts")
ARTIFACTS.mkdir(exist_ok=True)

legacy_user_id = None
patched = False
rollback = None


class ApiFailure(RuntimeError):
    pass


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def parse_json(data):
    if not data:
        return None
    try:
        return json.loads(data.decode("utf-8"))
    except Exception:
        return None


def request_json(url, method="GET", headers=None, payload=None, allow_error=False):
    request_headers = dict(headers or {})
    body = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/json")
    request = urllib.request.Request(url, data=body, method=method, headers=request_headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            return response.status, parse_json(raw)
    except urllib.error.HTTPError as exc:
        parsed = parse_json(exc.read())
        if allow_error:
            return exc.code, parsed
        code = None
        if isinstance(parsed, dict):
            code = parsed.get("code") or parsed.get("error_code") or parsed.get("error")
        suffix = f" code={code}" if code else ""
        raise ApiFailure(f"{method} request failed HTTP {exc.code}{suffix}") from None


def mgmt_get():
    status, payload = request_json(
        MANAGEMENT_URL,
        headers={
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "User-Agent": "RenderLab-215A-Hosted-Execution/1.0",
        },
    )
    if status != 200 or not isinstance(payload, dict):
        raise ApiFailure("Management Auth config read failed.")
    return payload


def mgmt_patch(payload):
    status, response = request_json(
        MANAGEMENT_URL,
        method="PATCH",
        headers={
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "User-Agent": "RenderLab-215A-Hosted-Execution/1.0",
        },
        payload=payload,
    )
    if status != 200 or not isinstance(response, dict):
        raise ApiFailure("Management Auth config patch failed.")
    return response


def admin_request(path, method="GET", payload=None, allow_error=False):
    return request_json(
        f"{SUPABASE_URL}/auth/v1/{path}",
        method=method,
        headers={"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"},
        payload=payload,
        allow_error=allow_error,
    )


def user_auth(path, method="POST", payload=None, token=None, allow_error=False):
    headers = {"apikey": PUBLISHABLE_KEY}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return request_json(
        f"{SUPABASE_URL}/auth/v1/{path}",
        method=method,
        headers=headers,
        payload=payload,
        allow_error=allow_error,
    )


def create_user(email, password):
    status, payload = admin_request(
        "admin/users",
        method="POST",
        payload={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"renderlab_fixture": "account-auth-215a-legacy"},
        },
    )
    user_id = payload.get("id") if isinstance(payload, dict) else None
    if status not in (200, 201) or not isinstance(user_id, str):
        raise ApiFailure("Owned Auth fixture creation failed.")
    return user_id


def delete_user(user_id):
    if not user_id:
        return
    status, _ = admin_request(
        f"admin/users/{urllib.parse.quote(user_id)}",
        method="DELETE",
        allow_error=True,
    )
    if status not in (200, 204, 404):
        raise ApiFailure(f"Owned Auth fixture cleanup failed HTTP {status}.")


def sign_in(email, password, allow_error=False):
    return user_auth(
        "token?grant_type=password",
        payload={"email": email, "password": password},
        allow_error=allow_error,
    )


def sha(value):
    return hashlib.sha256(str(value or "").encode()).hexdigest()


def assert_baseline(config):
    assert config.get("site_url") == EXPECTED_SITE_URL, "Site URL drifted after preflight."
    assert config.get("uri_allow_list") == EXPECTED_URI_ALLOW_LIST, "Redirect allowlist drifted after preflight."
    assert config.get("smtp_host") == "smtp.resend.com", "SMTP host drifted."
    assert str(config.get("smtp_port")) == "587", "SMTP port drifted."
    assert config.get("smtp_sender_name") == "RenderLab", "SMTP sender name drifted."
    assert config.get("smtp_admin_email") == "noreply@mail.renderlab.faresuniform.uk", "SMTP sender address drifted."
    assert config.get("password_min_length") == 6, "Password minimum no longer matches authorized before-state."
    assert config.get("password_required_characters") is None, "Required-character policy drifted."
    assert config.get("password_hibp_enabled") is False, "HIBP state drifted from Free-plan baseline."
    assert config.get("security_update_password_require_current_password") is False, "Hosted current-password enforcement drifted."
    assert config.get("security_update_password_require_reauthentication") is False, "Hosted nonce reauthentication drifted."
    assert config.get("mailer_secure_email_change_enabled") is True, "Secure email-change mode drifted."
    assert config.get("security_captcha_enabled") is False, "CAPTCHA state drifted."

    expected_rates = {
        "rate_limit_anonymous_users": 30,
        "rate_limit_email_sent": 30,
        "rate_limit_otp": 30,
        "rate_limit_sms_sent": 30,
        "rate_limit_token_refresh": 150,
        "rate_limit_verify": 30,
        "rate_limit_web3": 30,
    }
    for key, value in expected_rates.items():
        assert config.get(key) == value, f"{key} drifted after preflight."

    for key in (
        "mailer_notifications_password_changed_enabled",
        "mailer_notifications_email_changed_enabled",
        "mailer_notifications_identity_linked_enabled",
        "mailer_notifications_identity_unlinked_enabled",
        "mailer_notifications_mfa_factor_enrolled_enabled",
        "mailer_notifications_mfa_factor_unenrolled_enabled",
    ):
        assert config.get(key) is False, f"{key} drifted after preflight."

    assert sha(config.get("mailer_templates_invite_content")) == "71922d2a386d29b3ebd1dee1fec15a44d67ae05fd7de1b6d1e801f7dd40d6306", "Invite template drifted."
    assert sha(config.get("mailer_templates_recovery_content")) == "41a7d804f9f135c15e4843a65cecad1bcfd7b8efd0d54384d11f00a2bc40b05c", "Recovery template drifted."


def changed_fields():
    return list(PATCH.keys())


def safe_snapshot(config):
    template_keys = [key for key in changed_fields() if key.startswith("mailer_templates_")]
    subject_keys = [key for key in changed_fields() if key.startswith("mailer_subjects_")]
    toggle_keys = [key for key in changed_fields() if key.startswith("mailer_notifications_")]
    return {
        "password_min_length": config.get("password_min_length"),
        "password_required_characters": config.get("password_required_characters"),
        "password_hibp_enabled": config.get("password_hibp_enabled"),
        "site_url": config.get("site_url"),
        "uri_allow_list": config.get("uri_allow_list"),
        "smtp_host": config.get("smtp_host"),
        "smtp_port": config.get("smtp_port"),
        "smtp_sender_name": config.get("smtp_sender_name"),
        "smtp_admin_email": config.get("smtp_admin_email"),
        "security_captcha_enabled": config.get("security_captcha_enabled"),
        "security_update_password_require_current_password": config.get("security_update_password_require_current_password"),
        "security_update_password_require_reauthentication": config.get("security_update_password_require_reauthentication"),
        "rate_limits": {
            key: config.get(key)
            for key in (
                "rate_limit_anonymous_users",
                "rate_limit_email_sent",
                "rate_limit_otp",
                "rate_limit_sms_sent",
                "rate_limit_token_refresh",
                "rate_limit_verify",
                "rate_limit_web3",
            )
        },
        "subjects": {key: config.get(key) for key in subject_keys},
        "notification_toggles": {key: config.get(key) for key in toggle_keys},
        "template_fingerprints": {
            key: {"sha256": sha(config.get(key)), "length": len(str(config.get(key) or ""))}
            for key in template_keys
        },
        "invite_template_sha256": sha(config.get("mailer_templates_invite_content")),
        "recovery_template_sha256": sha(config.get("mailer_templates_recovery_content")),
    }


def verify_after(before, after):
    if after.get("password_min_length") != 15:
        raise ApiFailure("Password minimum did not read back as 15.")
    if after.get("password_required_characters") is not None:
        raise ApiFailure("Required-character policy changed unexpectedly.")
    for key, value in PATCH.items():
        if after.get(key) != value:
            raise ApiFailure(f"Authorized field {key} failed exact readback.")
    for key in (
        "site_url",
        "uri_allow_list",
        "smtp_host",
        "smtp_port",
        "smtp_sender_name",
        "smtp_admin_email",
        "rate_limit_anonymous_users",
        "rate_limit_email_sent",
        "rate_limit_otp",
        "rate_limit_sms_sent",
        "rate_limit_token_refresh",
        "rate_limit_verify",
        "rate_limit_web3",
        "security_captcha_enabled",
        "password_hibp_enabled",
        "security_update_password_require_current_password",
        "security_update_password_require_reauthentication",
    ):
        if after.get(key) != before.get(key):
            raise ApiFailure(f"Unscoped field {key} changed unexpectedly.")
    if sha(after.get("mailer_templates_invite_content")) != sha(before.get("mailer_templates_invite_content")):
        raise ApiFailure("Invite template changed unexpectedly.")
    if sha(after.get("mailer_templates_recovery_content")) != sha(before.get("mailer_templates_recovery_content")):
        raise ApiFailure("Recovery template changed unexpectedly.")


def cleanup_fixture():
    global legacy_user_id
    if legacy_user_id:
        delete_user(legacy_user_id)
        legacy_user_id = None


try:
    before = mgmt_get()
    assert_baseline(before)
    rollback = {key: before.get(key) for key in changed_fields()}
    (ARTIFACTS / "account-auth-hardening-215a-rollback.json").write_text(
        json.dumps(rollback, indent=2, sort_keys=True) + "\n"
    )
    (ARTIFACTS / "account-auth-hardening-215a-before.json").write_text(
        json.dumps(safe_snapshot(before), indent=2, sort_keys=True) + "\n"
    )

    legacy_email = f"renderlab-215a-legacy-{os.environ.get('GITHUB_RUN_ID', 'run')}@example.com"
    legacy_password = "Rl" + secrets.token_hex(5)  # exactly 12 characters; intentionally below the target floor.
    legacy_user_id = create_user(legacy_email, legacy_password)
    status, before_login = sign_in(legacy_email, legacy_password)
    if status != 200 or not isinstance(before_login, dict) or not before_login.get("access_token"):
        raise ApiFailure("Owned legacy fixture could not sign in before policy strengthening.")
    print("LEGACY_FIXTURE_SIGNIN_BEFORE=true")

    mgmt_patch(PATCH)
    patched = True
    after = mgmt_get()
    verify_after(before, after)
    print("HOSTED_AUTH_PATCH_READBACK=true")

    status, after_login = sign_in(legacy_email, legacy_password, allow_error=True)
    if status != 200 or not isinstance(after_login, dict) or not after_login.get("access_token"):
        raise ApiFailure(f"Existing below-policy credential did not retain sign-in access after strengthening (HTTP {status}).")
    access_token = after_login["access_token"]
    print("LEGACY_FIXTURE_SIGNIN_AFTER=true")

    below_password = "Rl" + secrets.token_hex(5)
    weak_status, weak_payload = user_auth(
        "user",
        method="PUT",
        token=access_token,
        payload={"password": below_password},
        allow_error=True,
    )
    weak_code = weak_payload.get("code") if isinstance(weak_payload, dict) else None
    if weak_status < 400 or weak_code != "weak_password":
        raise ApiFailure(
            f"Below-policy password was not rejected with weak_password (HTTP {weak_status}, code={weak_code})."
        )
    print("BELOW_POLICY_PASSWORD_REJECTED=true")

    (ARTIFACTS / "account-auth-hardening-215a-after.json").write_text(
        json.dumps(safe_snapshot(after), indent=2, sort_keys=True) + "\n"
    )
    (ARTIFACTS / "account-auth-hardening-215a-execution.json").write_text(
        json.dumps(
            {
                "project_ref": PROJECT_REF,
                "completed_at_utc": now_iso(),
                "password_min_length_before": before.get("password_min_length"),
                "password_min_length_after": after.get("password_min_length"),
                "required_character_policy_after": after.get("password_required_characters"),
                "site_url_unchanged": after.get("site_url") == before.get("site_url"),
                "redirect_allowlist_unchanged": after.get("uri_allow_list") == before.get("uri_allow_list"),
                "smtp_nonsecret_metadata_unchanged": all(
                    after.get(key) == before.get(key)
                    for key in ("smtp_host", "smtp_port", "smtp_sender_name", "smtp_admin_email")
                ),
                "rate_limits_unchanged": all(
                    after.get(key) == before.get(key)
                    for key in (
                        "rate_limit_anonymous_users",
                        "rate_limit_email_sent",
                        "rate_limit_otp",
                        "rate_limit_sms_sent",
                        "rate_limit_token_refresh",
                        "rate_limit_verify",
                        "rate_limit_web3",
                    )
                ),
                "captcha_evaluated_deferred_unchanged_disabled": after.get("security_captcha_enabled") is False,
                "leaked_password_protection_plan_gated_unchanged": after.get("password_hibp_enabled") is False,
                "hosted_current_password_enforcement_unchanged_disabled": after.get("security_update_password_require_current_password") is False,
                "hosted_nonce_reauthentication_unchanged_disabled": after.get("security_update_password_require_reauthentication") is False,
                "legacy_signin_preserved": True,
                "below_policy_password_rejected": True,
                "scoped_security_notifications_enabled": True,
                "invite_template_unchanged": True,
                "recovery_template_unchanged": True,
                "fixture_credentials_recorded": False,
                "secrets_recorded": False,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )

    cleanup_fixture()
    print("OWNED_FIXTURE_CLEAN=true")
    print("HOSTED_AUTH_215A_MUTATION_COMPLETE=true")
except Exception as exc:
    rollback_ok = False
    if patched and rollback is not None:
        try:
            mgmt_patch(rollback)
            restored = mgmt_get()
            rollback_ok = all(restored.get(key) == value for key, value in rollback.items())
        except Exception:
            rollback_ok = False
    try:
        cleanup_fixture()
    except Exception:
        pass
    (ARTIFACTS / "account-auth-hardening-215a-failure.json").write_text(
        json.dumps(
            {
                "failed_at_utc": now_iso(),
                "patched_before_failure": patched,
                "automatic_rollback_verified": rollback_ok,
                "error_type": type(exc).__name__,
                "secret_values_recorded": False,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )
    print(f"HOSTED_AUTH_215A_FAILED={type(exc).__name__}")
    print("HOSTED_AUTH_215A_AUTOMATIC_ROLLBACK=" + str(rollback_ok).lower())
    raise
