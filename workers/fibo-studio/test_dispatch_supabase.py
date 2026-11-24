import os
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

from dispatch_supabase import SupabaseDispatchStore, begin_generation_attempt, verified_ca_path


class Connection:
    def __init__(self, rows):
        self.cursor_value = MagicMock()
        self.cursor_value.__enter__.return_value.fetchall.return_value = rows

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def cursor(self, **_):
        return self.cursor_value


class SupabaseDispatchStoreTest(unittest.TestCase):
    def test_reads_only_the_database_url_and_requires_a_postgres_identity(self):
        with patch.dict(os.environ, {
            "RENDERLAB_DISPATCH_DATABASE_URL": "postgresql://renderlab_modal_dispatcher:secret@pooler.example:5432/postgres",
        }, clear=True):
            self.assertEqual(SupabaseDispatchStore().database_url.split(":", 1)[0], "postgresql")

        for invalid in ("", "https://example.supabase.co", "postgresql://pooler.example/postgres"):
            with self.subTest(invalid=invalid):
                with self.assertRaisesRegex(RuntimeError, "credentials are unavailable"):
                    SupabaseDispatchStore(database_url=invalid)

    def test_connection_forces_tls_and_a_bounded_timeout(self):
        connect = MagicMock(return_value=object())
        psycopg = types.ModuleType("psycopg")
        psycopg.connect = connect
        rows = types.ModuleType("psycopg.rows")
        rows.dict_row = object()
        store = SupabaseDispatchStore(
            database_url="postgresql://renderlab_modal_dispatcher:secret@pooler.example:5432/postgres?sslmode=disable",
        )
        with patch.dict(sys.modules, {"psycopg": psycopg, "psycopg.rows": rows}), \
             patch("dispatch_supabase.verified_ca_path", return_value="/fixture/supabase-root-ca.pem"), \
             patch.dict(os.environ, {"PGSSLROOTCERT": "/untrusted.pem", "PGSSLMODE": "disable"}):
            store._connect()

        self.assertEqual(connect.call_args.kwargs["sslmode"], "verify-full")
        self.assertEqual(connect.call_args.kwargs["sslrootcert"], "/fixture/supabase-root-ca.pem")
        self.assertEqual(connect.call_args.kwargs["connect_timeout"], 15)
        self.assertIs(connect.call_args.kwargs["row_factory"], rows.dict_row)

    def test_missing_or_invalid_ca_never_connects(self):
        store = SupabaseDispatchStore(database_url="postgresql://dispatcher:fixture@pooler.example/postgres")
        with patch("dispatch_supabase.verified_ca_path", side_effect=RuntimeError("Dispatcher PostgreSQL TLS trust root is unavailable")):
            with patch("psycopg.connect") as connect:
                with self.assertRaisesRegex(RuntimeError, "trust root is unavailable"):
                    store._connect()
                connect.assert_not_called()

    def test_certificate_rejection_is_sanitized_and_not_downgraded(self):
        import psycopg
        store = SupabaseDispatchStore(database_url="postgresql://dispatcher:fixture@pooler.example/postgres")
        with patch("dispatch_supabase.verified_ca_path", return_value="/fixture/supabase-root-ca.pem"), \
             patch("psycopg.connect", side_effect=psycopg.OperationalError("SECRET@private-host")) as connect:
            with self.assertRaises(RuntimeError) as observed:
                store._connect()
        self.assertIn("sslmode=verify-full", str(observed.exception))
        self.assertIn("without lowering TLS verification", str(observed.exception))
        self.assertNotIn("SECRET", str(observed.exception))
        self.assertNotIn("private-host", str(observed.exception))
        self.assertTrue(observed.exception.__suppress_context__)
        connect.assert_called_once()
        self.assertEqual(15, connect.call_args.kwargs["connect_timeout"])

    def test_repository_ca_has_reviewable_provenance_and_matching_bytes(self):
        from pathlib import Path
        from hashlib import sha256
        import json
        import ssl
        directory = Path(__file__).with_name("certs")
        pem = directory / "supabase-root-ca.pem"
        provenance = json.loads((directory / "supabase-root-ca.json").read_text(encoding="utf-8"))
        self.assertTrue(pem.is_file(), "Worker 1 must supply the dashboard CA before qualification")
        raw = pem.read_bytes()
        self.assertEqual(sha256(raw).hexdigest(), provenance["sha256"])
        self.assertEqual("Supabase Dashboard > Database Settings > SSL Configuration > Download Certificate", provenance["source"])
        self.assertNotIn(b"PRIVATE KEY", raw)
        self.assertIn(b"-----BEGIN CERTIFICATE-----", raw)
        self.assertGreater(ssl.create_default_context(cafile=str(pem)).cert_store_stats()["x509_ca"], 0)
        self.assertEqual(str(pem), verified_ca_path(directory))

    def test_provenance_digest_mismatch_fails_closed(self):
        from pathlib import Path
        from tempfile import TemporaryDirectory
        import json
        with TemporaryDirectory() as temp:
            directory = Path(temp)
            (directory / "supabase-root-ca.pem").write_bytes(b"not the reviewed certificate")
            (directory / "supabase-root-ca.json").write_text(json.dumps({"sha256": "0" * 64}), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "trust root is unavailable"):
                verified_ca_path(directory)

    def test_lookup_uses_parameterized_rpc_over_the_database_connection(self):
        connection = Connection([{
            "status": "pending", "provider_job_id": None, "execution_started_at": None,
            "backend_call_id": None, "send_reserved_at": None,
        }])
        store = SupabaseDispatchStore(
            database_url="postgresql://renderlab_modal_dispatcher:secret@pooler.example:5432/postgres",
        )
        with patch.object(store, "_connect", return_value=connection):
            store.lookup("00000000-0000-0000-0000-000000000001")

        statement, parameters = connection.cursor_value.__enter__.return_value.execute.call_args.args
        self.assertIn("renderlab_lookup_generation_call(%s::uuid)", statement)
        self.assertEqual(parameters, ("00000000-0000-0000-0000-000000000001",))

    def test_heartbeat_uses_the_dispatcher_only_rpc(self):
        connection = Connection([{"accepted": True}])
        store = SupabaseDispatchStore(
            database_url="postgresql://renderlab_modal_dispatcher:secret@pooler.example:5432/postgres",
        )
        summary = {"claimed": 2, "dispatched": 1, "retried": 1, "failed": 0, "unresolved": 0}
        with patch.object(store, "_connect", return_value=connection):
            store.record_heartbeat(environment="main", trigger="scheduled", summary=summary)

        statement, parameters = connection.cursor_value.__enter__.return_value.execute.call_args.args
        self.assertIn("renderlab_record_generation_dispatch_heartbeat", statement)
        self.assertEqual(parameters, ("main", "scheduled", 2, 1, 1, 0, 0))

    def test_worker_attempt_guard_fails_closed(self):
        connection = Connection([{"accepted": False}])
        database_url = "postgresql://renderlab_modal_worker:secret@pooler.example:5432/postgres"
        with patch.dict(os.environ, {"RENDERLAB_DISPATCH_DATABASE_URL": database_url}, clear=True), \
             patch.object(SupabaseDispatchStore, "_connect", return_value=connection):
            with self.assertRaisesRegex(RuntimeError, "duplicate, cancelled, stale or unverifiable"):
                begin_generation_attempt(
                    "00000000-0000-0000-0000-000000000001",
                    "2026-11-20T00:00:00+00:00",
                    "fc-" + "a" * 26,
                )


    def test_claim_uses_bounded_rpc_without_unbounded_fallback(self):
        from datetime import datetime, timedelta, timezone
        store = SupabaseDispatchStore(database_url="postgresql://dispatcher:fixture@pooler.example/postgres")
        now = datetime.now(timezone.utc)
        with patch.object(store, "_query", return_value=[]) as query:
            self.assertEqual([], store.claim_due(now=now, lease_until=now + timedelta(seconds=90), limit=8))
        statement, parameters = query.call_args.args
        self.assertIn("renderlab_claim_generation_dispatch_bounded", statement)
        self.assertEqual((store.claim_token, 90, 8), parameters)
        with patch.object(store, "_query", side_effect=RuntimeError("missing migration")) as query:
            with self.assertRaisesRegex(RuntimeError, "missing migration"):
                store.claim_due(now=now, lease_until=now + timedelta(seconds=90), limit=8)
            query.assert_called_once()


if __name__ == "__main__":
    unittest.main()
