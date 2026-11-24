# Dispatcher TLS canary — Supabase dashboard CA qualification

**Hold:** the live canary at 7335a83b exited 1 with `FAIL dispatcher_tls_tls_certificate_or_connection_rejected`. The combined reason does not distinguish an unknown CA, hostname mismatch, authentication, or reachability failure. Do not release the original #603/#625 TLS change. Supabase explicitly recommends verify-full for its pooler with the dashboard root CA: https://supabase.com/docs/guides/platform/ssl-enforcement and https://supabase.com/docs/guides/database/psql.

## Reviewed public certificate provenance

Worker 1 supplied the dashboard public root CA (Supabase Root 2021 CA) on 2026-11-24, recorded at handoff commit `e43d7a406ce8abec5e4404d2ccdbec5c52830765`. Source: approved RenderLab Supabase Dashboard > Database Settings > SSL Configuration > Download Certificate. The certificate file is `workers/fibo-studio/certs/supabase-root-ca.pem`, with provenance in `supabase-root-ca.json` alongside it. SHA-256 of the PEM file bytes (not the DER fingerprint):

```text
700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7
```

Canonical LF checkout is required; CI verifies the file digest, parses the CA, and checks the reported subject. Verify offline with `sha256sum workers/fibo-studio/certs/supabase-root-ca.pem` and `openssl x509 -in workers/fibo-studio/certs/supabase-root-ca.pem -noout -subject -issuer -dates -fingerprint -sha256`. Future rotation requires a fresh dashboard download, a reviewed digest and provenance update, exact-head CI and a new authorized canary; never substitute a peer leaf, private key, OS CA or connection string.

## TLS policy and packaging

The shared PostgreSQL store uses only the packaged Supabase CA at `/opt/renderlab/certs/supabase-root-ca.pem` in Modal, with its reviewed SHA-256 manifest and CA parsing checked before connecting. It supplies `sslrootcert`, `sslmode=verify-full`, and a 15-second connect timeout explicitly, overriding inherited SSL settings and connection-string SSL mode/root. No OS bundle or require fallback. Gateway, candidate gateway and renderer all package the same two public files because the worker admission guard also uses this store. The canary is CPU-only and reuses the gateway dependency/CA image and exact store connection path.

Use verify-full by default: Supabase documents hostname verification for the session pooler. If it fails, do not retry with weaker settings. A separately approved credential-free TLS inspection of the configured pooler hostname (e.g. `openssl s_client -starttls postgres -connect HOST:PORT -servername HOST -CAfile workers/fibo-studio/certs/supabase-root-ca.pem -verify_hostname HOST -verify_return_error`) may distinguish chain from SAN mismatch; record only sanitized certificate validation outcome, not the private connection string. Only a confirmed hostname mismatch with successful CA validation and a documented accepted hostname-identity risk may justify a reviewed **static** verify-ca policy change and corresponding distinct canary marker/tests. Never automatically downgrade or claim verify-full on verify-ca. This PR selects verify-full; no mismatch evidence exists yet.

## Worker 1 one-shot run

After green exact-head CI and release authorization, from repository root with the approved Modal profile and the existing resource-name variables `RENDERLAB_MODAL_ENVIRONMENT`, `RENDERLAB_MODAL_DISPATCHER_SECRET`, `RENDERLAB_MODAL_GATEWAY_SECRET`, `RENDERLAB_MODAL_MONITOR_SECRET` exported, run:

```bash
python3 scripts/run-dispatcher-tls-canary.py
```

The launcher explicitly selects `dispatcher_tls_canary.py::app.main`, captures child output without exposing credentials, and requires exit 0 plus exactly `PASS dispatcher_tls_verify_full_select_1`. Any failure yields a fixed FAIL marker and exit 1. The isolated app attaches only the existing dispatcher secret, executes only `select 1 as probe_ok`, has 0.25 CPU and 45-second remote timeout, no GPU, schedule, deployment or database mutation. The launcher has a 600-second bound. Never repeat live runs without authorization. Record source SHA, environment name, time, marker and exit. Neither gateway nor renderer TLS rollout is permitted before a live pass; qualify the renderer admission guard under the standard release runbook separately. Restore the previously qualified version on rollback; no automatic downgrade. #603/#625 remain held and superseded for TLS purposes; non-TLS split is independent.
