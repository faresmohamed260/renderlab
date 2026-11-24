"""Least-privilege PostgreSQL store for Modal dispatch and attempt guards."""
from __future__ import annotations

from datetime import datetime
import os
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

from dispatch_core import DispatchIntent, Lookup, LookupState


class SupabaseDispatchStore:
    def __init__(self, *, database_url=None):
        self.database_url = database_url or os.environ.get("RENDERLAB_DISPATCH_DATABASE_URL", "")
        parsed = urlsplit(self.database_url)
        if parsed.scheme not in ("postgres", "postgresql") or not parsed.hostname or not parsed.username:
            raise RuntimeError("Dispatcher database credentials are unavailable")
        self.claim_token = str(uuid4())

    def _connect(self):
        import psycopg
        from psycopg.rows import dict_row

        # libpq's sslmode=require encrypts but does not verify hostname or CA.
        # Prefer the OS/custom CA bundle where present; keep require only on
        # stripped images with no readable CA store (documented exception).
        explicit_ca = os.environ.get("PGSSLROOTCERT")
        ca_bundle = explicit_ca or "/etc/ssl/certs/ca-certificates.crt"
        if explicit_ca and not Path(explicit_ca).is_file():
            raise RuntimeError("Dispatcher PostgreSQL TLS trust root is unavailable; check PGSSLROOTCERT points to a readable CA bundle (verification was not downgraded)")
        tls = ({"sslmode": "verify-full", "sslrootcert": ca_bundle}
               if Path(ca_bundle).is_file() else {"sslmode": "require"})
        try:
            return psycopg.connect(
                self.database_url,
                connect_timeout=15,
                **tls,
                application_name="renderlab-modal-dispatch",
                row_factory=dict_row,
            )
        except psycopg.OperationalError:
            # This exception reaches the scheduled dispatch invocation logs.
            # Suppress libpq's raw error: it can echo database URLs and secrets.
            # Never retry with weaker TLS after verify-full rejects the peer.
            raise RuntimeError(
                "Dispatcher PostgreSQL connection failed under sslmode="
                + tls["sslmode"] + "; check DB reachability, pooler hostname, "
                "server certificate and CA bundle; dispatch halted without "
                "lowering TLS verification"
            ) from None

    def _query(self, statement, parameters):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(statement, parameters)
                return cursor.fetchall()

    def claim_due(self, *, now, lease_until, limit):
        rows = self._query(
            "select * from public.renderlab_claim_generation_dispatch(%s::uuid, %s::integer, %s::integer)",
            (self.claim_token, max(30, int((lease_until - now).total_seconds())), limit),
        )
        return [DispatchIntent(
            attempt_id=str(row["attempt_id"]), job_id=str(row["job_id"]), backend=row["backend_key"],
            model_key=row["model_key"], model_version=row["model_version"], operation=row["operation"],
            payload=row["payload"], attempt_count=row["delivery_count"] - 1,
            admission_deadline=row["admission_deadline"] if isinstance(row["admission_deadline"], datetime)
            else datetime.fromisoformat(row["admission_deadline"].replace("Z", "+00:00")),
        ) for row in rows]

    def _finish(self, intent, status, *, handle=None, next_attempt_at=None, error=None):
        rows = self._query(
            "select public.renderlab_finish_generation_dispatch(%s::uuid, %s::uuid, %s::text, %s::text, %s::timestamptz, %s::text) as accepted",
            (intent.attempt_id, self.claim_token, status, handle, next_attempt_at, error),
        )
        if len(rows) != 1 or rows[0]["accepted"] is not True:
            raise RuntimeError("Dispatch claim was lost before its outcome could be committed")

    def mark_dispatched(self, intent, handle): self._finish(intent, "dispatched", handle=handle)
    def mark_retry(self, intent, *, next_attempt_at, error): self._finish(intent, "retry_wait", next_attempt_at=next_attempt_at, error=error)
    def mark_failed(self, intent, *, error): self._finish(intent, "failed", error=error)
    def mark_unresolved(self, intent, *, error): self._finish(intent, "unresolved", error=error)

    def record_heartbeat(self, *, environment, trigger, summary):
        rows = self._query(
            "select public.renderlab_record_generation_dispatch_heartbeat(%s::text, %s::text, %s::integer, %s::integer, %s::integer, %s::integer, %s::integer) as accepted",
            (
                environment, trigger, summary["claimed"], summary["dispatched"],
                summary["retried"], summary["failed"], summary["unresolved"],
            ),
        )
        if len(rows) != 1 or rows[0]["accepted"] is not True:
            raise RuntimeError("Dispatch heartbeat was not committed")

    def reserve_send(self, attempt_id):
        rows = self._query(
            "select public.renderlab_reserve_generation_dispatch_send(%s::uuid, %s::uuid) as accepted",
            (attempt_id, self.claim_token),
        )
        return len(rows) == 1 and rows[0]["accepted"] is True

    def lookup(self, attempt_id):
        rows = self._query(
            "select * from public.renderlab_lookup_generation_call(%s::uuid)",
            (attempt_id,),
        )
        if not rows:
            return Lookup(LookupState.UNRESOLVED)
        row = rows[0]
        handle = row["provider_job_id"] or row["backend_call_id"]
        if handle:
            return Lookup(LookupState.ACCEPTED, handle)
        if row["send_reserved_at"] or row["execution_started_at"] or row["status"] == "unresolved":
            return Lookup(LookupState.UNRESOLVED)
        return Lookup(LookupState.ABSENT)


def begin_generation_attempt(attempt_id, admission_deadline, backend_call_id=None):
    store = SupabaseDispatchStore()
    if backend_call_id is None:
        rows = store._query(
            "select public.renderlab_begin_generation_attempt(%s::uuid, %s::timestamptz) as accepted",
            (attempt_id, admission_deadline),
        )
    else:
        rows = store._query(
            "select public.renderlab_begin_generation_call(%s::uuid, %s::timestamptz, %s::text) as accepted",
            (attempt_id, admission_deadline, backend_call_id),
        )
    if len(rows) != 1 or rows[0]["accepted"] is not True:
        raise RuntimeError("Generation attempt is duplicate, cancelled, stale or unverifiable")
