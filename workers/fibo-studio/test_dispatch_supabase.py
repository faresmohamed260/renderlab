import os
from datetime import datetime, timezone
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

from dispatch_core import Dispatcher
from dispatch_supabase import SupabaseDispatchStore, begin_generation_attempt


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
             patch("dispatch_supabase.Path.is_file", return_value=True), \
             patch.dict(os.environ, {"PGSSLROOTCERT": "/test/ca.pem"}):
            store._connect()

        self.assertEqual(connect.call_args.kwargs["sslmode"], "verify-full")
        self.assertEqual(connect.call_args.kwargs["sslrootcert"], "/test/ca.pem")
        self.assertEqual(connect.call_args.kwargs["connect_timeout"], 15)
        self.assertIs(connect.call_args.kwargs["row_factory"], rows.dict_row)

    def test_missing_ca_retains_encrypted_tls_without_pretending_to_verify_hostname(self):
        connect = MagicMock(return_value=object())
        psycopg = types.ModuleType("psycopg")
        psycopg.connect = connect
        rows = types.ModuleType("psycopg.rows")
        rows.dict_row = object()
        store = SupabaseDispatchStore(
            database_url="postgresql://renderlab_modal_dispatcher:secret@pooler.example:5432/postgres",
        )
        with patch.dict(sys.modules, {"psycopg": psycopg, "psycopg.rows": rows}), \
             patch("dispatch_supabase.Path.is_file", return_value=False), \
             patch.dict(os.environ, {"PGSSLROOTCERT": ""}):
            store._connect()
        self.assertEqual(connect.call_args.kwargs["sslmode"], "require")
        self.assertNotIn("sslrootcert", connect.call_args.kwargs)

    def test_explicit_ca_must_not_silently_downgrade_hostname_verification(self):
        store = SupabaseDispatchStore(
            database_url="postgresql://renderlab_modal_dispatcher:secret@pooler.example:5432/postgres",
        )
        psycopg = types.ModuleType("psycopg")
        psycopg.connect = MagicMock()
        rows = types.ModuleType("psycopg.rows")
        rows.dict_row = object()
        with patch.dict(sys.modules, {"psycopg": psycopg, "psycopg.rows": rows}), \
             patch.dict(os.environ, {"PGSSLROOTCERT": "/missing/ca.pem"}), \
             patch("dispatch_supabase.Path.is_file", return_value=False):
            with self.assertRaisesRegex(RuntimeError, "trust root is unavailable"):
                store._connect()
        psycopg.connect.assert_not_called()

    def test_verify_full_certificate_failure_is_actionable_and_never_retried_weakly(self):
        operational_error = type("OperationalError", (Exception,), {})
        connect = MagicMock(side_effect=operational_error(
            "certificate verify failed for db-user:secret@private-pooler.example"
        ))
        psycopg = types.ModuleType("psycopg")
        psycopg.connect = connect
        psycopg.OperationalError = operational_error
        rows = types.ModuleType("psycopg.rows")
        rows.dict_row = object()
        store = SupabaseDispatchStore(
            database_url="postgresql://db-user:secret@private-pooler.example:5432/postgres",
        )
        with patch.dict(sys.modules, {"psycopg": psycopg, "psycopg.rows": rows}), \
             patch("dispatch_supabase.Path.is_file", return_value=True), \
             patch.dict(os.environ, {"PGSSLROOTCERT": "/trust/ca.pem"}):
            with self.assertRaises(RuntimeError) as observed:
                Dispatcher(store, {}).tick(datetime(2026, 11, 23, tzinfo=timezone.utc))
        error = observed.exception
        self.assertIn("sslmode=verify-full", str(error))
        self.assertIn("check DB reachability, pooler hostname", str(error))
        self.assertIn("CA bundle", str(error))
        self.assertIn("dispatch halted without lowering TLS verification", str(error))
        self.assertTrue(error.__suppress_context__)
        for sensitive in ("secret", "db-user", "private-pooler.example"):
            self.assertNotIn(sensitive, str(error))
        connect.assert_called_once()
        self.assertEqual(connect.call_args.kwargs["connect_timeout"], 15)
        self.assertEqual(connect.call_args.kwargs["sslmode"], "verify-full")
        self.assertEqual(connect.call_args.kwargs["sslrootcert"], "/trust/ca.pem")
        # A failed connection must never be retried in encrypted-only require mode.

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


if __name__ == "__main__":
    unittest.main()
