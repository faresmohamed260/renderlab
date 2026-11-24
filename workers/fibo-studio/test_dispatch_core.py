from dataclasses import replace
from datetime import datetime, timedelta, timezone
import unittest

from dispatch_core import (
    Dispatcher, DispatchIntent, Lookup, LookupState, PermanentDispatchError,
    TransientDispatchError, UnknownDispatchOutcome,
)


NOW = datetime(2026, 11, 19, 20, 0, tzinfo=timezone.utc)


def intent(attempt="attempt-1", count=0, deadline=None):
    return DispatchIntent(attempt, "job-1", "fibo", "fibo-2.0-turbo", "bria-fibo-2.0-turbo",
                          "create-image", {"prompt": "test"}, count, deadline or NOW + timedelta(minutes=10))


class Store:
    def __init__(self, intents):
        self.due = list(intents)
        self.claimed = set()
        self.events = []

    def claim_due(self, **_):
        result = [item for item in self.due if item.attempt_id not in self.claimed]
        self.claimed.update(item.attempt_id for item in result)
        return result

    def mark_dispatched(self, item, handle): self.events.append(("dispatched", item.attempt_id, handle))
    def mark_retry(self, item, **details): self.events.append(("retry", item.attempt_id, details))
    def mark_failed(self, item, **details): self.events.append(("failed", item.attempt_id, details))
    def mark_unresolved(self, item, **details): self.events.append(("unresolved", item.attempt_id, details))


class Backend:
    def __init__(self, outcomes=(), lookups=()):
        self.outcomes = list(outcomes)
        self.lookups = list(lookups)
        self.renders = 0

    def lookup(self, _):
        return self.lookups.pop(0) if self.lookups else Lookup(LookupState.ABSENT)

    def submit(self, _):
        self.renders += 1
        outcome = self.outcomes.pop(0) if self.outcomes else "fc-handle"
        if isinstance(outcome, Exception): raise outcome
        return outcome


class DispatchCoreTest(unittest.TestCase):
    def test_overlapping_ticks_claim_once_and_prevent_duplicate_render(self):
        store, backend = Store([intent()]), Backend()
        dispatcher = Dispatcher(store, {"fibo": backend})
        self.assertEqual(dispatcher.tick(NOW).dispatched, 1)
        self.assertEqual(dispatcher.tick(NOW).claimed, 0)
        self.assertEqual(backend.renders, 1)

    def test_missed_wake_is_recovered_by_later_tick(self):
        store, backend = Store([intent()]), Backend()
        self.assertEqual(Dispatcher(store, {"fibo": backend}).tick(NOW + timedelta(minutes=1)).dispatched, 1)
        self.assertEqual(backend.renders, 1)

    def test_restart_recovers_existing_acceptance_without_second_render(self):
        store = Store([intent()])
        backend = Backend(lookups=[Lookup(LookupState.ACCEPTED, "fc-original")])
        self.assertEqual(Dispatcher(store, {"fibo": backend}).tick(NOW).dispatched, 1)
        self.assertEqual(backend.renders, 0)
        self.assertEqual(store.events[0], ("dispatched", "attempt-1", "fc-original"))

    def test_lost_response_reconciles_original_attempt_without_resubmit(self):
        store = Store([intent()])
        backend = Backend(
            outcomes=[UnknownDispatchOutcome("connection dropped")],
            lookups=[Lookup(LookupState.ABSENT), Lookup(LookupState.ACCEPTED, "fc-recovered")],
        )
        self.assertEqual(Dispatcher(store, {"fibo": backend}).tick(NOW).dispatched, 1)
        self.assertEqual(backend.renders, 1)

    def test_unverifiable_lost_response_is_unresolved_not_retried(self):
        store = Store([intent()])
        backend = Backend(outcomes=[UnknownDispatchOutcome("timeout")])
        self.assertEqual(Dispatcher(store, {"fibo": backend}).tick(NOW).unresolved, 1)
        self.assertEqual(backend.renders, 1)
        self.assertEqual(store.events[0][0], "unresolved")

    def test_transient_retry_is_bounded_and_permanent_failure_is_not_retried(self):
        retry_store = Store([intent(count=3)])
        retry_backend = Backend(outcomes=[TransientDispatchError("busy")])
        self.assertEqual(Dispatcher(retry_store, {"fibo": retry_backend}).tick(NOW).failed, 1)
        permanent_store = Store([intent(attempt="attempt-2")])
        permanent_backend = Backend(outcomes=[PermanentDispatchError("invalid")])
        self.assertEqual(Dispatcher(permanent_store, {"fibo": permanent_backend}).tick(NOW).failed, 1)

    def test_accepted_attempt_is_reattached_after_dispatch_deadline(self):
        item = intent(deadline=NOW)
        store = Store([item])
        backend = Backend(lookups=[Lookup(LookupState.ACCEPTED, "existing-handle")])
        self.assertEqual(Dispatcher(store, {"fibo": backend}).tick(NOW).dispatched, 1)
        self.assertEqual(store.events, [("dispatched", item.attempt_id, "existing-handle")])
        self.assertEqual(backend.renders, 0)

    def test_expired_attempt_and_missing_bound_backend_fail_closed(self):
        expired_store = Store([intent(deadline=NOW)])
        self.assertEqual(Dispatcher(expired_store, {"fibo": Backend()}).tick(NOW).failed, 1)
        missing_store = Store([replace(intent(), backend="removed")])
        self.assertEqual(Dispatcher(missing_store, {}).tick(NOW).failed, 1)


    def test_unexpected_submit_reconciles_without_resending_and_continues_batch(self):
        for fault in (OverflowError("SECRET"), KeyError("SECRET")):
            with self.subTest(fault=type(fault).__name__):
                store = Store([intent(), intent("attempt-2")])
                backend = Backend(outcomes=[fault], lookups=[
                    Lookup(LookupState.ABSENT), Lookup(LookupState.ACCEPTED, "fc-recovered"),
                ])
                summary = Dispatcher(store, {"fibo": backend}).tick(NOW)
                self.assertEqual((2, 2, 0), (summary.claimed, summary.dispatched, summary.unresolved))
                self.assertEqual(2, backend.renders)
                self.assertEqual(("dispatched", "attempt-1", "fc-recovered"), store.events[0])

    def test_unexpected_submit_with_unknown_acceptance_never_retries(self):
        store = Store([intent(), intent("attempt-2")])
        backend = Backend(outcomes=[OverflowError("SECRET")])
        summary = Dispatcher(store, {"fibo": backend}).tick(NOW)
        self.assertEqual((2, 1, 1), (summary.claimed, summary.dispatched, summary.unresolved))
        self.assertEqual(2, backend.renders)
        self.assertEqual("unresolved", store.events[0][0])
        self.assertNotIn("SECRET", repr(store.events))

    def test_lookup_and_all_finish_failures_are_isolated_even_if_unresolved_write_fails(self):
        from unittest.mock import patch
        cases = (
            ("lookup", None),
            ("mark_dispatched", None),
            ("mark_retry", TransientDispatchError("busy")),
            ("mark_failed", PermanentDispatchError("invalid")),
            ("mark_unresolved", UnknownDispatchOutcome("timeout")),
        )
        for method, error in cases:
            with self.subTest(method=method):
                store = Store([intent(), intent("attempt-2")])
                backend = Backend(outcomes=[error] if error else [])
                target = backend if method == "lookup" else store
                original = getattr(target, method)
                def fail_first(item, *args, **kwargs):
                    if (item if isinstance(item, str) else item.attempt_id) == "attempt-1":
                        raise RuntimeError("claim lost SECRET")
                    return original(item, *args, **kwargs)
                with patch.object(target, method, side_effect=fail_first), \
                     patch.object(store, "mark_unresolved", side_effect=RuntimeError("write failed SECRET")):
                    summary = Dispatcher(store, {"fibo": backend}).tick(NOW)
                self.assertEqual((2, 1, 1), (summary.claimed, summary.dispatched, summary.unresolved))
                self.assertEqual(("dispatched", "attempt-2", "fc-handle"), store.events[-1])
                self.assertEqual(1 if method == "lookup" else 2, backend.renders)

    def test_lookup_failure_never_calls_provider_for_that_intent(self):
        store = Store([intent(), intent("attempt-2")])
        backend = Backend()
        from unittest.mock import patch
        with patch.object(backend, "lookup", side_effect=[
            KeyError("SECRET"), Lookup(LookupState.ABSENT)
        ]):
            summary = Dispatcher(store, {"fibo": backend}).tick(NOW)
        self.assertEqual((2, 1, 1), (summary.claimed, summary.dispatched, summary.unresolved))
        self.assertEqual(1, backend.renders)
        self.assertEqual("unresolved", store.events[0][0])
        self.assertNotIn("SECRET", repr(store.events))

if __name__ == "__main__":
    unittest.main()
