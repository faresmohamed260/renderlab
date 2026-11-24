"""Recoverable, backend-neutral dispatch loop.

The store owns atomic claims and durable state. The dispatcher never treats a
timeout as proof that a backend rejected an attempt.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
import logging
from typing import Any, Mapping, Protocol


class LookupState(str, Enum):
    ABSENT = "absent"
    ACCEPTED = "accepted"
    UNRESOLVED = "unresolved"


@dataclass(frozen=True)
class Lookup:
    state: LookupState
    handle: str | None = None


@dataclass(frozen=True)
class DispatchIntent:
    attempt_id: str
    job_id: str
    backend: str
    model_key: str
    model_version: str
    operation: str
    payload: Mapping[str, Any]
    attempt_count: int
    admission_deadline: datetime


class TransientDispatchError(Exception):
    pass


class PermanentDispatchError(Exception):
    pass


class UnknownDispatchOutcome(Exception):
    pass


class DispatchStore(Protocol):
    def claim_due(self, *, now: datetime, lease_until: datetime, limit: int) -> list[DispatchIntent]: ...
    def mark_dispatched(self, intent: DispatchIntent, handle: str) -> None: ...
    def mark_retry(self, intent: DispatchIntent, *, next_attempt_at: datetime, error: str) -> None: ...
    def mark_failed(self, intent: DispatchIntent, *, error: str) -> None: ...
    def mark_unresolved(self, intent: DispatchIntent, *, error: str) -> None: ...


class DispatchBackend(Protocol):
    def lookup(self, attempt_id: str) -> Lookup: ...
    def submit(self, intent: DispatchIntent) -> str: ...


@dataclass(frozen=True)
class DispatchSummary:
    claimed: int = 0
    dispatched: int = 0
    retried: int = 0
    failed: int = 0
    unresolved: int = 0


class Dispatcher:
    def __init__(
        self,
        store: DispatchStore,
        backends: Mapping[str, DispatchBackend],
        *,
        max_attempts: int = 4,
        claim_seconds: int = 90,
        batch_size: int = 8,
    ):
        self.store = store
        self.backends = backends
        self.max_attempts = max_attempts
        self.claim_seconds = claim_seconds
        self.batch_size = batch_size

    def tick(self, now: datetime | None = None) -> DispatchSummary:
        now = now or datetime.now(timezone.utc)
        intents = self.store.claim_due(
            now=now,
            lease_until=now + timedelta(seconds=self.claim_seconds),
            limit=self.batch_size,
        )
        totals = {"claimed": len(intents), "dispatched": 0, "retried": 0, "failed": 0, "unresolved": 0}
        for intent in intents:
            try:
                outcome = self._dispatch(intent, now)
                totals[outcome] += 1
            except Exception:
                # Recover once using durable acceptance evidence, never an
                # exception type as proof that a provider send was absent.
                # If lookup or the conditional finish is unavailable, leave
                # the lease for guarded recovery instead of parking a
                # potentially never-sent intent as permanently unresolved.
                backend = self.backends.get(intent.backend)
                try:
                    if backend is None:
                        raise RuntimeError("bound backend unavailable")
                    outcome = self._recover_unknown(
                        backend, intent, "unexpected dispatch processing failure", now)
                    totals[outcome] += 1
                except Exception:
                    logging.getLogger(__name__).warning("dispatch_intent_recovery_unconfirmed")
                    totals["unresolved"] += 1
        return DispatchSummary(**totals)

    def _dispatch(self, intent: DispatchIntent, now: datetime) -> str:
        backend = self.backends.get(intent.backend)
        if backend is None:
            self.store.mark_failed(intent, error="bound backend is unavailable")
            return "failed"
        lookup = backend.lookup(intent.attempt_id)
        if lookup.state is LookupState.ACCEPTED:
            if not lookup.handle:
                self.store.mark_unresolved(intent, error="accepted attempt has no execution handle")
                return "unresolved"
            self.store.mark_dispatched(intent, lookup.handle)
            return "dispatched"
        if lookup.state is LookupState.UNRESOLVED:
            self.store.mark_unresolved(intent, error="backend reports unresolved acceptance")
            return "unresolved"
        if now >= intent.admission_deadline:
            self.store.mark_failed(intent, error="attempt admission expired")
            return "failed"
        try:
            handle = backend.submit(intent)
            if not handle:
                raise UnknownDispatchOutcome("backend returned no execution handle")
            self.store.mark_dispatched(intent, handle)
            return "dispatched"
        except PermanentDispatchError as error:
            self.store.mark_failed(intent, error=str(error)[:500])
            return "failed"
        except TransientDispatchError as error:
            return self._retry_absent(intent, now, str(error)[:500])
        except UnknownDispatchOutcome as error:
            return self._recover_unknown(backend, intent, str(error)[:500], now)
        except Exception:
            # Unexpected validation/provider/finish exceptions do not prove
            # non-acceptance. Reconcile before deciding whether retry is safe.
            return self._recover_unknown(backend, intent, "unexpected dispatch outcome", now)

    def _retry_absent(self, intent: DispatchIntent, now: datetime, error: str) -> str:
        if intent.attempt_count + 1 >= self.max_attempts:
            self.store.mark_failed(intent, error="dispatch retry limit reached")
            return "failed"
        delay = min(5 * (2 ** intent.attempt_count), 60)
        next_attempt = now + timedelta(seconds=delay)
        if next_attempt >= intent.admission_deadline:
            self.store.mark_failed(intent, error="dispatch retry would exceed admission deadline")
            return "failed"
        self.store.mark_retry(intent, next_attempt_at=next_attempt, error=error)
        return "retried"

    def _recover_unknown(self, backend: DispatchBackend, intent: DispatchIntent, error: str, now: datetime) -> str:
        reconciled = backend.lookup(intent.attempt_id)
        if reconciled.state is LookupState.ACCEPTED and reconciled.handle:
            self.store.mark_dispatched(intent, reconciled.handle)
            return "dispatched"
        if reconciled.state is LookupState.ABSENT:
            return self._retry_absent(intent, now, error)
        self.store.mark_unresolved(intent, error=error)
        return "unresolved"
