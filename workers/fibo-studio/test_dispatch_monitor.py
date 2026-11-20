import unittest

from dispatch_monitor import monitor_dispatch_health


SECRET = "a" * 32
URL = "https://renderlab.faresuniform.uk/api/internal/generation/reconcile"


class Response:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self.payload = payload

    def json(self):
        return self.payload


def health(*, missing=False):
    return {
        "oldestDueSeconds": 0,
        "expiredClaims": 0,
        "unresolved": 0,
        "scheduledHeartbeatAgeSeconds": None if missing else 14,
        "scheduledHeartbeatMissing": missing,
    }


class DispatchMonitorTest(unittest.TestCase):
    def test_accepts_healthy_and_unhealthy_bounded_responses(self):
        observed = {}

        def healthy_request(url, **options):
            observed.update(url=url, **options)
            return Response(200, {"ok": True, "health": health()})

        result = monitor_dispatch_health(URL, SECRET, request=healthy_request)
        self.assertEqual("healthy", result["status"])
        self.assertEqual({"attempted": 0, "accepted": 0, "failed": 0}, result["notification"])
        self.assertEqual(False, observed["follow_redirects"])
        self.assertEqual(f"Bearer {SECRET}", observed["headers"]["authorization"])

        result = monitor_dispatch_health(
            URL,
            SECRET,
            request=lambda *_args, **_kwargs: Response(503, {
                "ok": False,
                "health": health(missing=True),
                "notification": {"attempted": 1, "accepted": 1, "failed": 0},
                "ignored": "not logged",
            }),
        )
        self.assertEqual("unhealthy", result["status"])
        self.assertEqual(1, result["notification"]["accepted"])
        self.assertNotIn("ignored", result)

    def test_rejects_unapproved_urls_and_short_secrets(self):
        invalid = (
            "http://renderlab.faresuniform.uk/api/internal/generation/reconcile",
            "https://other.example/api/internal/generation/reconcile",
            "https://renderlab.faresuniform.uk/other",
            "https://user@renderlab.faresuniform.uk/api/internal/generation/reconcile",
            "https://renderlab.faresuniform.uk/api/internal/generation/reconcile?secret=x",
        )
        for url in invalid:
            with self.subTest(url=url), self.assertRaisesRegex(RuntimeError, "approved"):
                monitor_dispatch_health(url, SECRET, request=lambda *_args, **_kwargs: None)
        with self.assertRaisesRegex(RuntimeError, "too short"):
            monitor_dispatch_health(URL, "short", request=lambda *_args, **_kwargs: None)

    def test_rejects_inconsistent_or_unbounded_responses(self):
        cases = (
            Response(200, {"ok": False, "health": health()}),
            Response(503, {"ok": True, "health": health()}),
            Response(500, {"ok": False, "health": health()}),
            Response(200, {"ok": True, "health": {**health(), "unresolved": -1}}),
        )
        for response in cases:
            with self.subTest(status=response.status_code), self.assertRaises(RuntimeError):
                monitor_dispatch_health(URL, SECRET, request=lambda *_args, **_kwargs: response)


if __name__ == "__main__":
    unittest.main()
