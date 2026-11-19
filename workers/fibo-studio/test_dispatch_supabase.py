import json
import os
import unittest
from unittest.mock import patch

from dispatch_supabase import SupabaseDispatchStore


class Response:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self):
        return self.payload


class SupabaseDispatchStoreTest(unittest.TestCase):
    def test_uses_modern_api_key_header_without_bearer_authentication(self):
        captured = []

        def open_request(request, timeout):
            captured.append((request, timeout))
            return Response([])

        store = SupabaseDispatchStore(url="https://example.supabase.co", api_key="sb_secret_scoped")
        with patch("dispatch_supabase.urlopen", open_request):
            store.lookup("00000000-0000-0000-0000-000000000001")

        request, timeout = captured[0]
        self.assertEqual(timeout, 15)
        self.assertEqual(request.get_header("Apikey"), "sb_secret_scoped")
        self.assertIsNone(request.get_header("Authorization"))

    def test_reads_environment_local_api_key_and_rejects_legacy_variable_only(self):
        with patch.dict(os.environ, {
            "RENDERLAB_DISPATCH_SUPABASE_URL": "https://example.supabase.co",
            "RENDERLAB_DISPATCH_SUPABASE_API_KEY": "sb_secret_scoped",
        }, clear=True):
            self.assertEqual(SupabaseDispatchStore().api_key, "sb_secret_scoped")

        with patch.dict(os.environ, {
            "RENDERLAB_DISPATCH_SUPABASE_URL": "https://example.supabase.co",
            "RENDERLAB_DISPATCH_SUPABASE_ACCESS_TOKEN": "legacy-token",
        }, clear=True):
            with self.assertRaisesRegex(RuntimeError, "credentials are unavailable"):
                SupabaseDispatchStore()


if __name__ == "__main__":
    unittest.main()
