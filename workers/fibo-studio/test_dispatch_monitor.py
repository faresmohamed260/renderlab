import unittest

from dispatch_monitor import monitor_dispatch_health_direct


def _healthy_raw():
    return {
        "oldestDueSeconds": 0,
        "expiredClaims": 0,
        "unresolved": 0,
        "scheduledHeartbeatAgeSeconds": 14,
        "scheduledHeartbeatMissing": False,
    }


def _unhealthy_raw(*, missing=False):
    return {
        "oldestDueSeconds": 200 if not missing else 0,
        "expiredClaims": 1 if not missing else 0,
        "unresolved": 0,
        "scheduledHeartbeatAgeSeconds": None if missing else 0,
        "scheduledHeartbeatMissing": missing,
    }


class _MockDB:
    def __init__(self, health_raw, *, should_notify=False):
        self._health = health_raw
        self._should_notify = should_notify
        self.inserts = []
        self.rpc_calls = []
        self.resolved_at = None
        self.selected = []

    def get_rpc(self, name):
        assert name == "renderlab_generation_dispatch_health"
        return self._health

    def post_rpc(self, name, body):
        self.rpc_calls.append((name, body))
        if name == "renderlab_record_operational_alert":
            return [{
                "alert_key": "generation-dispatch-health",
                "family": "generation-provider-degradation",
                "severity": "warning",
                "state": "open",
                "first_seen_at": "2026-01-01T00:00:00Z",
                "last_seen_at": "2026-01-01T00:00:00Z",
                "occurrence_count": 1,
                "last_event": "generation.reconciliation",
                "last_code": None,
                "last_notified_at": None,
                "should_notify": self._should_notify,
            }]
        if name == "renderlab_resolve_operational_alert":
            self.resolved_at = body.get("p_resolved_at")
            return True
        return {}

    def insert(self, table, row):
        self.inserts.append((table, row))

    def select(self, table, params):
        self.selected.append((table, params))
        return []

    def get_user_email(self, user_id):
        return None


class DispatchMonitorDirectTest(unittest.TestCase):
    def test_healthy_resolves_alert_and_returns_healthy(self):
        db = _MockDB(_healthy_raw())
        result = monitor_dispatch_health_direct("", "", "", db=db)

        self.assertEqual("healthy", result["status"])
        self.assertEqual({"attempted": 0, "accepted": 0, "failed": 0}, result["notification"])
        self.assertIsNotNone(db.resolved_at)
        self.assertEqual([], db.inserts)
        rpc_names = [name for name, _ in db.rpc_calls]
        self.assertIn("renderlab_resolve_operational_alert", rpc_names)
        self.assertNotIn("renderlab_record_operational_alert", rpc_names)

    def test_unhealthy_records_alert_and_skips_notify_when_flag_false(self):
        db = _MockDB(_unhealthy_raw(), should_notify=False)
        result = monitor_dispatch_health_direct("", "", "", db=db)

        self.assertEqual("unhealthy", result["status"])
        self.assertEqual({"attempted": 0, "accepted": 0, "failed": 0}, result["notification"])
        self.assertIsNone(db.resolved_at)
        self.assertEqual(1, len(db.inserts))
        table, row = db.inserts[0]
        self.assertEqual("renderlab_diagnostic_events", table)
        self.assertEqual("reconciliation_failed", row["code"])
        rpc_names = [name for name, _ in db.rpc_calls]
        self.assertIn("renderlab_record_operational_alert", rpc_names)

    def test_unhealthy_missing_heartbeat_uses_stalled_code(self):
        db = _MockDB(_unhealthy_raw(missing=True), should_notify=False)
        result = monitor_dispatch_health_direct("", "", "", db=db)

        self.assertEqual("unhealthy", result["status"])
        _, row = db.inserts[0]
        self.assertEqual("generation_orchestration_stalled", row["code"])

    def test_notify_skipped_when_no_resend_key(self):
        db = _MockDB(_unhealthy_raw(), should_notify=True)
        result = monitor_dispatch_health_direct("", "", "", db=db)

        self.assertEqual({"attempted": 0, "accepted": 0, "failed": 0}, result["notification"])

    def test_rejects_invalid_health_values(self):
        bad_cases = [
            {**_healthy_raw(), "unresolved": -1},
            {**_healthy_raw(), "expiredClaims": float("inf")},
            {**_healthy_raw(), "scheduledHeartbeatMissing": "yes"},
            "not a dict",
        ]
        for bad in bad_cases:
            with self.subTest(raw=bad), self.assertRaises(RuntimeError):
                monitor_dispatch_health_direct("", "", "", db=_MockDB(bad))

    def test_missing_client_requires_url_and_key(self):
        with self.assertRaisesRegex(RuntimeError, "required"):
            monitor_dispatch_health_direct("", "", "")


if __name__ == "__main__":
    unittest.main()
