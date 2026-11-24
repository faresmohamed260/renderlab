# One-shot dispatcher PostgreSQL TLS canary (qualification only)

This read-only probe is stacked on #603. It shares the production gateway dependency/CA image with only the Python source modules necessary for cold import added, the same dispatcher connection path and the existing dispatcher-only Modal secret. It has no HTTP endpoint, schedule, GPU, provider call, job claim or database mutation.

## Worker 1 runbook (next batch; never run live during CI)

1. Check out the exact qualified stacked #625 head on the approved deployment workstation. Confirm the approved Modal workspace/profile and target environment. Record the SHA and environment name, not credentials.
2. Export the existing resource-name variables: `RENDERLAB_MODAL_ENVIRONMENT`, `RENDERLAB_MODAL_DISPATCHER_SECRET`, `RENDERLAB_MODAL_GATEWAY_SECRET`, `RENDERLAB_MODAL_MONITOR_SECRET`. Gateway/monitor names are required by the imported production declaration; only the dispatcher secret is attached to the canary. Never echo credentials, URLs, CA contents or environment dumps.
3. From repository root with the approved Modal CLI on PATH, execute the guarded launcher:

   ```bash
   python3 scripts/run-dispatcher-tls-canary.py
   ```

   On Windows use the approved Python interpreter in place of `python3`. The launcher runs from `workers/fibo-studio` and explicitly selects the local entrypoint: `modal run --quiet --env "$RENDERLAB_MODAL_ENVIRONMENT" dispatcher_tls_canary.py::app.main`. Do not substitute raw `modal run`: errors before entrypoint execution bypass its Python exception handler.
4. Require exit **0** and exactly `PASS dispatcher_tls_verify_full_select_1`. Every ordinary launch/import/CLI/remote/query failure produces exit 1 and one fixed `FAIL dispatcher_tls_...` marker. Raw child stdout/stderr are not emitted. The independent ephemeral app uses 0.25 CPU and a 45-second remote timeout; the launcher bounds the overall CLI call to 600 seconds. No detach or gateway deployment.
5. Failure keeps both PRs unmerged and out of the next batch. Record only the sanitized marker, SHA, environment name and time. Categories identify missing/invalid resource names, CLI installation/import, invocation, authentication, secret attachment, image build, environment, remote failure or TLS/CA rejection. An unclassified pre-marker error yields `FAIL dispatcher_tls_modal_failed_before_marker`; zero exit without proof or an inconsistent marker/exit also fails. Never weaken TLS, rotate secrets or change database configuration just to pass.

## Prior failed attempt and evidence

Worker 1's retained transcript for b1197875 (Modal CLI 1.6.4, approved profile/environment, all four resource-name variables present) records exit 1 after about 3.4 seconds, no PASS or FAIL. Raw last lines were not persisted; the precise historical error is not recoverable. This does not prove a TLS rejection. The revised launcher covers pre-entrypoint failures, explicitly selects the canary and packages the production-declaration import. Offline checks cover the subprocess contract and marker/exit combinations, redaction, CA and query behavior. A live pass remains a separate worker-1-owned qualification, not a claim made by CI.

The probe requires a system or explicit CA file before using the dispatcher store so its documented `sslmode=require` compatibility fallback cannot count as verified. The only SQL is `select 1 as probe_ok`. A pass proves a verified TLS read-only round trip in the approved environment, not dispatch privileges, migration compatibility, provider availability or deployment authorization.
