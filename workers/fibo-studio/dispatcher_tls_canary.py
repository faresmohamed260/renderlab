"""One-shot, read-only PostgreSQL TLS canary in the production gateway image.

The disposable Modal app has no schedule, provider endpoint or GPU. It never
prints credentials, connection metadata, or raw database exception messages.
Run only on the explicitly selected Modal environment before qualifying #603.
"""
from pathlib import Path
import os

import modal

# Reuse the exact production gateway image, resource-name forwarding and the
# existing dispatcher-only Modal Secret. No duplicate CA/psycopg configuration.
from modal_native_production import gateway_image, dispatcher_secret, runtime_env

app = modal.App("renderlab-dispatcher-tls-canary")

# Preserve the gateway dependency/CA image, adding only the modules needed
# to cold-import this entrypoint and its production declaration remotely.
canary_image = gateway_image.add_local_python_source(
    "modal_native_production", "dispatcher_tls_canary"
)


@app.function(
    image=canary_image, env=runtime_env, secrets=[dispatcher_secret],
    cpu=0.25, timeout=45,
)
def probe():
    try:
        from dispatch_supabase import SupabaseDispatchStore
    except Exception:
        return {"ok": False, "reason": "remote_import_failed"}

    # The dispatcher intentionally has an encrypted-only fallback when an
    # OS CA bundle is absent. This *canary* must not report that as verified.
    try:
        ca_path = os.environ.get("PGSSLROOTCERT") or "/etc/ssl/certs/ca-certificates.crt"
        if not Path(ca_path).is_file():
            return {"ok": False, "reason": "ca_bundle_unavailable_no_verify_full"}
        # _query uses the same psycopg connection, sslmode=verify-full, trust
        # root, connect_timeout and role as the live dispatcher. SELECT only.
        rows = SupabaseDispatchStore()._query("select 1 as probe_ok", ())
        if len(rows) != 1 or rows[0]["probe_ok"] != 1:
            return {"ok": False, "reason": "unexpected_readonly_query_result"}
        return {"ok": True, "reason": "verify_full_select_1"}
    except RuntimeError as error:
        # Categorize only our own fixed, sanitized driver wrapper messages.
        # Never return/print str(error), libpq diagnostics or URL components.
        message = str(error)
        if "trust root is unavailable" in message:
            reason = "tls_trust_root_unavailable"
        elif "sslmode=verify-full" in message:
            reason = "tls_certificate_or_connection_rejected"
        else:
            reason = "dispatcher_configuration_or_query_rejected"
        return {"ok": False, "reason": reason}
    except Exception:
        return {"ok": False, "reason": "dispatcher_readonly_query_failed"}


@app.local_entrypoint()
def main():
    try:
        result = probe.remote()
    except (Exception, KeyboardInterrupt, SystemExit):
        print("FAIL dispatcher_tls_canary_remote_unavailable", flush=True)
        raise SystemExit(1) from None

    if result == {"ok": True, "reason": "verify_full_select_1"}:
        print("PASS dispatcher_tls_verify_full_select_1", flush=True)
        return
    # Restrict local logging to the predefined reason vocabulary.
    allowed = {
        "ca_bundle_unavailable_no_verify_full",
        "unexpected_readonly_query_result",
        "tls_trust_root_unavailable",
        "tls_certificate_or_connection_rejected",
        "dispatcher_configuration_or_query_rejected",
        "dispatcher_readonly_query_failed",
        "remote_import_failed",
    }
    reason = result.get("reason") if isinstance(result, dict) else None
    if not isinstance(reason, str) or reason not in allowed:
        reason = "unexpected_canary_result"
    print("FAIL dispatcher_tls_" + reason, flush=True)
    raise SystemExit(1)
