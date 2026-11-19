"""Narrow Supabase REST client for the Modal dispatcher and attempt guard."""
from __future__ import annotations

from datetime import datetime
import json
import os
from urllib.request import Request, urlopen
from uuid import uuid4

from dispatch_core import DispatchIntent, Lookup, LookupState


class SupabaseDispatchStore:
    def __init__(self, *, url=None, access_token=None):
        self.url = (url or os.environ.get("RENDERLAB_DISPATCH_SUPABASE_URL", "")).rstrip("/")
        self.access_token = access_token or os.environ.get("RENDERLAB_DISPATCH_SUPABASE_ACCESS_TOKEN", "")
        if not self.url or not self.access_token:
            raise RuntimeError("Dispatcher storage credentials are unavailable")
        self.claim_token = str(uuid4())

    def _request(self, path, payload=None, method="POST"):
        data = None if payload is None else json.dumps(payload).encode()
        request = Request(
            f"{self.url}/rest/v1/{path}", data=data, method=method,
            headers={"apikey": self.access_token, "authorization": f"Bearer {self.access_token}",
                     "content-type": "application/json"},
        )
        with urlopen(request, timeout=15) as response:
            body = response.read()
        return json.loads(body) if body else None

    def claim_due(self, *, now, lease_until, limit):
        rows = self._request("rpc/renderlab_claim_generation_dispatch", {
            "p_claim_token": self.claim_token,
            "p_lease_seconds": max(30, int((lease_until - now).total_seconds())),
            "p_limit": limit,
        }) or []
        return [DispatchIntent(
            attempt_id=row["attempt_id"], job_id=row["job_id"], backend=row["backend_key"],
            model_key=row["model_key"], model_version=row["model_version"], operation=row["operation"],
            payload=row["payload"], attempt_count=row["delivery_count"] - 1,
            admission_deadline=datetime.fromisoformat(row["admission_deadline"].replace("Z", "+00:00")),
        ) for row in rows]

    def _finish(self, intent, status, *, handle=None, next_attempt_at=None, error=None):
        accepted = self._request("rpc/renderlab_finish_generation_dispatch", {
            "p_attempt_id": intent.attempt_id,
            "p_claim_token": self.claim_token,
            "p_status": status,
            "p_provider_job_id": handle,
            "p_next_attempt_at": next_attempt_at.isoformat() if next_attempt_at else None,
            "p_error": error,
        })
        if accepted is not True:
            raise RuntimeError("Dispatch claim was lost before its outcome could be committed")

    def mark_dispatched(self, intent, handle): self._finish(intent, "dispatched", handle=handle)
    def mark_retry(self, intent, *, next_attempt_at, error): self._finish(intent, "retry_wait", next_attempt_at=next_attempt_at, error=error)
    def mark_failed(self, intent, *, error): self._finish(intent, "failed", error=error)
    def mark_unresolved(self, intent, *, error): self._finish(intent, "unresolved", error=error)

    def lookup(self, attempt_id):
        rows = self._request("rpc/renderlab_lookup_generation_attempt", {"p_attempt_id": attempt_id}) or []
        if not rows:
            return Lookup(LookupState.UNRESOLVED)
        row = rows[0]
        if row["provider_job_id"]:
            return Lookup(LookupState.ACCEPTED, row["provider_job_id"])
        if row["execution_started_at"] or row["status"] == "unresolved":
            return Lookup(LookupState.UNRESOLVED)
        return Lookup(LookupState.ABSENT)


def begin_generation_attempt(attempt_id, admission_deadline):
    store = SupabaseDispatchStore()
    accepted = store._request("rpc/renderlab_begin_generation_attempt", {
        "p_attempt_id": attempt_id,
        "p_admission_deadline": admission_deadline,
    })
    if accepted is not True:
        raise RuntimeError("Generation attempt is duplicate, cancelled, stale or unverifiable")
