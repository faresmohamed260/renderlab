"""Bounded production dispatch-health monitor shared by Modal gateway entrypoints."""
from __future__ import annotations

from collections.abc import Callable
import math
from typing import Any
from urllib.parse import urlsplit


HEALTH_HOST = "renderlab.faresuniform.uk"
HEALTH_PATH = "/api/internal/generation/reconcile"


def _monitor_url(value: str) -> str:
    parsed = urlsplit(value.strip())
    try:
        port = parsed.port
    except ValueError as error:
        raise RuntimeError("Dispatch monitor URL is not the approved production health endpoint") from error
    if (
        parsed.scheme != "https"
        or parsed.hostname != HEALTH_HOST
        or port is not None
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path != HEALTH_PATH
        or parsed.query
        or parsed.fragment
    ):
        raise RuntimeError("Dispatch monitor URL is not the approved production health endpoint")
    return parsed.geturl()


def _nonnegative_number(value: Any, name: str) -> int | float:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or value < 0
    ):
        raise RuntimeError(f"Dispatch health response has invalid {name}")
    return value


def _bounded_response(status_code: int, payload: Any) -> dict[str, Any]:
    if status_code not in (200, 503) or not isinstance(payload, dict):
        raise RuntimeError("Dispatch health endpoint returned an unexpected response")
    expected_ok = status_code == 200
    if payload.get("ok") is not expected_ok or not isinstance(payload.get("health"), dict):
        raise RuntimeError("Dispatch health endpoint returned an inconsistent status")

    health = payload["health"]
    heartbeat_age = health.get("scheduledHeartbeatAgeSeconds")
    if heartbeat_age is not None:
        heartbeat_age = _nonnegative_number(heartbeat_age, "scheduledHeartbeatAgeSeconds")
    missing = health.get("scheduledHeartbeatMissing")
    if not isinstance(missing, bool):
        raise RuntimeError("Dispatch health response has invalid scheduledHeartbeatMissing")
    bounded_health = {
        "oldestDueSeconds": _nonnegative_number(health.get("oldestDueSeconds"), "oldestDueSeconds"),
        "expiredClaims": _nonnegative_number(health.get("expiredClaims"), "expiredClaims"),
        "unresolved": _nonnegative_number(health.get("unresolved"), "unresolved"),
        "scheduledHeartbeatAgeSeconds": heartbeat_age,
        "scheduledHeartbeatMissing": missing,
    }

    notification = payload.get("notification", {})
    if not isinstance(notification, dict):
        raise RuntimeError("Dispatch health endpoint returned invalid notification counts")
    bounded_notification = {
        key: _nonnegative_number(notification.get(key, 0), key)
        for key in ("attempted", "accepted", "failed")
    }
    return {
        "event": "renderlab.dispatch-health-monitor",
        "status": "healthy" if expected_ok else "unhealthy",
        "health": bounded_health,
        "notification": bounded_notification,
    }


def monitor_dispatch_health(
    url: str,
    secret: str,
    *,
    request: Callable[..., Any] | None = None,
) -> dict[str, Any]:
    endpoint = _monitor_url(url)
    bearer = secret.strip()
    if len(bearer) < 32:
        raise RuntimeError("Dispatch monitor bearer secret is missing or too short")
    if request is None:
        import httpx

        request = httpx.get
    response = request(
        endpoint,
        headers={"authorization": f"Bearer {bearer}"},
        timeout=15.0,
        follow_redirects=False,
    )
    try:
        payload = response.json()
    except Exception as error:
        raise RuntimeError("Dispatch health endpoint returned invalid JSON") from error
    return _bounded_response(response.status_code, payload)
