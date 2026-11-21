"""Direct-database dispatch health monitor — no web-app dependency."""
from __future__ import annotations

import json
import math
from typing import Any


_ALERT_KEY = "generation-dispatch-health"
_ALERT_FAMILY = "generation-provider-degradation"
_ALERT_SEVERITY = "warning"
_ALERT_EVENT = "generation.reconciliation"
_ALERT_MAX_KEY_LEN = 80
_ADMIN_RECIPIENT_LIMIT = 20
_OLDEST_DUE_MAX_SECONDS = 180
_ALERT_SENDER = "RenderLab Operations <security@mail.renderlab.faresuniform.uk>"


def _nonnegative_number(value: Any, name: str) -> int | float:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or value < 0
    ):
        raise RuntimeError(f"Dispatch health response has invalid {name}")
    return value


def _validated_health(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise RuntimeError("Dispatch health RPC returned unexpected type")
    heartbeat_age = raw.get("scheduledHeartbeatAgeSeconds")
    if heartbeat_age is not None:
        heartbeat_age = _nonnegative_number(heartbeat_age, "scheduledHeartbeatAgeSeconds")
    missing = raw.get("scheduledHeartbeatMissing")
    if not isinstance(missing, bool):
        raise RuntimeError("Dispatch health response has invalid scheduledHeartbeatMissing")
    return {
        "oldestDueSeconds": _nonnegative_number(raw.get("oldestDueSeconds"), "oldestDueSeconds"),
        "expiredClaims": _nonnegative_number(raw.get("expiredClaims"), "expiredClaims"),
        "unresolved": _nonnegative_number(raw.get("unresolved"), "unresolved"),
        "scheduledHeartbeatAgeSeconds": heartbeat_age,
        "scheduledHeartbeatMissing": missing,
    }


def _is_healthy(health: dict[str, Any]) -> bool:
    return (
        not health["scheduledHeartbeatMissing"]
        and health["oldestDueSeconds"] <= _OLDEST_DUE_MAX_SECONDS
        and health["expiredClaims"] == 0
        and health["unresolved"] == 0
    )


class _SupabaseClient:
    def __init__(self, url: str, service_role_key: str):
        url = url.strip().rstrip("/")
        key = service_role_key.strip()
        if not url or not key:
            raise RuntimeError("Supabase URL and service role key are required for the health monitor")

        import httpx
        self._url = url
        self._key = key
        self._http = httpx.Client(
            base_url=url,
            headers={
                "apikey": key,
                "authorization": f"Bearer {key}",
                "content-type": "application/json",
            },
            timeout=15.0,
            follow_redirects=False,
        )

    def get_rpc(self, name: str) -> Any:
        response = self._http.get(f"/rest/v1/rpc/{name}")
        response.raise_for_status()
        return response.json()

    def post_rpc(self, name: str, body: dict) -> Any:
        response = self._http.post(f"/rest/v1/rpc/{name}", content=json.dumps(body))
        response.raise_for_status()
        return response.json()

    def insert(self, table: str, row: dict) -> None:
        response = self._http.post(
            f"/rest/v1/{table}",
            content=json.dumps(row),
            headers={"prefer": "return=minimal"},
        )
        response.raise_for_status()

    def select(self, table: str, params: dict) -> list:
        from urllib.parse import urlencode
        response = self._http.get(f"/rest/v1/{table}?{urlencode(params)}")
        response.raise_for_status()
        return response.json()

    def get_user_email(self, user_id: str) -> str | None:
        response = self._http.get(f"/auth/v1/admin/users/{user_id}")
        if not response.is_success:
            return None
        data = response.json()
        email = data.get("email")
        confirmed = data.get("email_confirmed_at")
        if isinstance(email, str) and email and confirmed:
            return email
        return None


def _resolve_alert(db: _SupabaseClient, resolved_at: str) -> None:
    db.post_rpc("renderlab_resolve_operational_alert", {
        "p_alert_key": _ALERT_KEY[:_ALERT_MAX_KEY_LEN],
        "p_resolved_at": resolved_at,
    })


def _record_alert(
    db: _SupabaseClient,
    health: dict[str, Any],
    timestamp: str,
) -> dict[str, Any] | None:
    code = (
        "generation_orchestration_stalled"
        if health["scheduledHeartbeatMissing"]
        else "reconciliation_failed"
    )
    duration_ms = max(
        health["oldestDueSeconds"],
        health["scheduledHeartbeatAgeSeconds"] or 0,
    ) * 1000

    db.insert("renderlab_diagnostic_events", {
        "occurred_at": timestamp,
        "event": _ALERT_EVENT,
        "level": "warn",
        "correlation_id": "generation-dispatch-health",
        "job_id": None,
        "operation": None,
        "phase": "stalled",
        "status": None,
        "code": code,
        "duration_ms": duration_ms,
        "count": health["expiredClaims"] + health["unresolved"],
        "success_count": None,
        "failure_count": None,
        "attempt": None,
    })

    rows = db.post_rpc("renderlab_record_operational_alert", {
        "p_alert_key": _ALERT_KEY[:_ALERT_MAX_KEY_LEN],
        "p_family": _ALERT_FAMILY,
        "p_severity": _ALERT_SEVERITY,
        "p_event": _ALERT_EVENT,
        "p_code": code,
        "p_seen_at": timestamp,
    })
    return rows[0] if isinstance(rows, list) and rows else None


def _admin_emails(db: _SupabaseClient) -> list[str]:
    rows = db.select("renderlab_account_access", {
        "role": "eq.admin",
        "status": "eq.active",
        "select": "user_id",
        "order": "created_at.asc,user_id.asc",
        "limit": str(_ADMIN_RECIPIENT_LIMIT),
    })
    emails: list[str] = []
    seen: set[str] = set()
    for row in rows:
        user_id = row.get("user_id")
        if not user_id:
            continue
        email = db.get_user_email(str(user_id))
        if email and email not in seen:
            emails.append(email)
            seen.add(email)
    return emails


def _email_content(alert: dict[str, Any]) -> dict[str, str]:
    family = str(alert.get("family", ""))
    severity = str(alert.get("severity", ""))
    family_label = family.replace("-", " ")
    raw_count = alert.get("occurrence_count", 1)
    count = max(1, int(raw_count)) if isinstance(raw_count, (int, float)) and math.isfinite(raw_count) else 1
    return {
        "subject": f"[RenderLab {severity}] {family_label}",
        "html": "".join([
            "<p><strong>RenderLab operational alert</strong></p>",
            f"<p>Family: {family_label}</p>",
            f"<p>Severity: {severity}</p>",
            f"<p>First seen: {alert.get('first_seen_at', '')}</p>",
            f"<p>Last seen: {alert.get('last_seen_at', '')}</p>",
            f"<p>Occurrences: {count}</p>",
            "<p>Inspect the fresh-admin Health section at /admin for bounded diagnostic context.</p>",
            "<p>This notification intentionally omits account, prompt, media, job, provider, worker, and storage identity.</p>",
        ]),
    }


def _notify(
    db: _SupabaseClient,
    alert: dict[str, Any],
    resend_key: str,
) -> dict[str, int]:
    import httpx

    recipients = _admin_emails(db)
    content = _email_content(alert)
    accepted = 0
    failed = 0
    for email in recipients:
        try:
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "authorization": f"Bearer {resend_key}",
                    "content-type": "application/json",
                },
                content=json.dumps({
                    "from": _ALERT_SENDER,
                    "to": [email],
                    "subject": content["subject"],
                    "html": content["html"],
                }),
                timeout=15.0,
                follow_redirects=False,
            )
            payload = response.json() if response.is_success else {}
            if isinstance(payload.get("id"), str) and payload["id"]:
                accepted += 1
            else:
                failed += 1
        except Exception:
            failed += 1
    return {"attempted": len(recipients), "accepted": accepted, "failed": failed}


def monitor_dispatch_health_direct(
    supabase_url: str,
    service_role_key: str,
    resend_key: str,
    *,
    db: Any = None,
) -> dict[str, Any]:
    from datetime import datetime, timezone

    if db is None:
        db = _SupabaseClient(supabase_url, service_role_key)
    timestamp = datetime.now(timezone.utc).isoformat()
    health = _validated_health(db.get_rpc("renderlab_generation_dispatch_health"))

    if _is_healthy(health):
        _resolve_alert(db, timestamp)
        return {
            "event": "renderlab.dispatch-health-monitor",
            "status": "healthy",
            "health": health,
            "notification": {"attempted": 0, "accepted": 0, "failed": 0},
        }

    alert = _record_alert(db, health, timestamp)
    notification: dict[str, int] = {"attempted": 0, "accepted": 0, "failed": 0}
    rk = resend_key.strip() if isinstance(resend_key, str) else ""
    if alert and alert.get("should_notify") and rk:
        notification = _notify(db, alert, rk)

    return {
        "event": "renderlab.dispatch-health-monitor",
        "status": "unhealthy",
        "health": health,
        "notification": notification,
    }
