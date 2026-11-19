import os
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

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
        with patch.dict(sys.modules, {"psycopg": psycopg, "psycopg.rows": rows}):
            store._connect()

        self.assertEqual(connect.call_args.kwargs["sslmode"], "require")
        self.assertEqual(connect.call_args.kwargs["connect_timeout"], 15)
        self.assertIs(connect.call_args.kwargs["row_factory"], rows.dict_row)

    def test_lookup_uses_parameterized_rpc_over_the_database_connection(self):
        connection = Connection([{
            "status": "pending", "provider_job_id": None, "execution_started_at": None,
        }])
        store = SupabaseDispatchStore(
            database_url="postgresql://renderlab_modal_dispatcher:secret@pooler.example:5432/postgres",
        )
        with patch.object(store, "_connect", return_value=connection):
            store.lookup("00000000-0000-0000-0000-000000000001")

        statement, parameters = connection.cursor_value.__enter__.return_value.execute.call_args.args
        self.assertIn("renderlab_lookup_generation_attempt(%s::uuid)", statement)
        self.assertEqual(parameters, ("00000000-0000-0000-0000-000000000001",))

    def test_worker_attempt_guard_fails_closed(self):
        connection = Connection([{"accepted": False}])
        database_url = "postgresql://renderlab_modal_worker:secret@pooler.example:5432/postgres"
        with patch.dict(os.environ, {"RENDERLAB_DISPATCH_DATABASE_URL": database_url}, clear=True), \
             patch.object(SupabaseDispatchStore, "_connect", return_value=connection):
            with self.assertRaisesRegex(RuntimeError, "duplicate, cancelled, stale or unverifiable"):
                begin_generation_attempt(
                    "00000000-0000-0000-0000-000000000001",
                    "2026-11-20T00:00:00+00:00",
                )


if __name__ == "__main__":
    unittest.main()
