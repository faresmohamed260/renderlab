"""Guard the Modal TLS canary, including errors before its local entrypoint."""
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

PASS = "PASS dispatcher_tls_verify_full_select_1"
PREFIX = "FAIL dispatcher_tls_"
REMOTE_REASONS = frozenset({
    "ca_bundle_unavailable_no_verify_full", "unexpected_readonly_query_result",
    "tls_trust_root_unavailable", "tls_certificate_or_connection_rejected",
    "dispatcher_configuration_or_query_rejected", "dispatcher_readonly_query_failed",
    "remote_import_failed", "canary_remote_unavailable", "unexpected_canary_result",
    "unexpected_tls_policy",
})
RESOURCE_NAMES = (
    "RENDERLAB_MODAL_ENVIRONMENT", "RENDERLAB_MODAL_DISPATCHER_SECRET",
    "RENDERLAB_MODAL_GATEWAY_SECRET", "RENDERLAB_MODAL_MONITOR_SECRET",
)
TIMEOUT_SECONDS = 600
WORKER_DIR = Path(__file__).resolve().parents[1] / "workers" / "fibo-studio"


def classify_cli_failure(output):
    """Fixed diagnostic categories, never echo raw child text."""
    lower = output.lower()
    if any(x in lower for x in ("modulenotfounderror", "importerror", "failed to import")):
        return "modal_import_failed"
    if any(x in lower for x in ("no such option", "no such command", "multiple entrypoints",
                                 "could not find function", "could not find a modal", "usage:")):
        return "modal_invocation_failed"
    # Match a resource noun as a word, not a substring of an identifier,
    # and associate the failure with that resource on the same line.
    # For example, "Environment not found SENTINEL_SECRET" is an
    # environment error, not a secret error.
    missing = r"(?:not found|does not exist|permission denied|does not match)"
    resource_failure = re.compile(
        r"\b(secret|environment)\b[^\r\n]*?\b" + missing + r"\b"
    )
    for line in lower.splitlines():
        match = resource_failure.search(line)
        if match:
            return ("modal_secret_unavailable" if match.group(1) == "secret"
                    else "modal_environment_unavailable")
    if any(x in lower for x in ("image build failed", "image build failure", "failed to build image")):
        return "modal_image_build_failed"
    if any(x in lower for x in ("authentication", "not authenticated", "invalid token", "permission denied")):
        return "modal_auth_or_permission_failed"
    return "modal_failed_before_marker"


def outcome():
    settings = {}
    for name in RESOURCE_NAMES:
        value = os.environ.get(name, "").strip()
        if not re.fullmatch(r"[a-z][a-z0-9-]{0,62}", value):
            return PREFIX + "invalid_resource_" + name.lower()
        settings[name] = value
    cli = shutil.which("modal")
    if not cli:
        return PREFIX + "modal_cli_not_found"
    if not (WORKER_DIR / "dispatcher_tls_canary.py").is_file():
        return PREFIX + "canary_source_unavailable"
    # Explicit local entrypoint, with sibling imports resolvable. Never detach.
    try:
        completed = subprocess.run(
            [cli, "run", "--quiet", "--env", settings["RENDERLAB_MODAL_ENVIRONMENT"],
             "dispatcher_tls_canary.py::app.main"],
            cwd=WORKER_DIR, env={**os.environ, **settings},
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding="utf-8", errors="replace",
            timeout=TIMEOUT_SECONDS, check=False,
        )
    except subprocess.TimeoutExpired:
        return PREFIX + "modal_invocation_timeout"
    except OSError:
        return PREFIX + "modal_cli_launch_failed"

    output = completed.stdout + "\n" + completed.stderr
    lines = [line.strip() for line in output.splitlines()]
    markers = [line for line in lines if line.startswith("PASS dispatcher_tls_") or line.startswith(PREFIX)]
    if markers == [PASS] and completed.returncode == 0:
        return PASS
    if len(markers) == 1 and markers[0].startswith(PREFIX) and completed.returncode != 0:
        reason = markers[0][len(PREFIX):]
        if reason in REMOTE_REASONS:
            return PREFIX + reason
    if markers:
        return PREFIX + "modal_marker_exit_mismatch"
    if completed.returncode == 0:
        return PREFIX + "modal_exit_without_proof"
    return PREFIX + classify_cli_failure(output)


def main():
    try:
        marker = outcome()
    except KeyboardInterrupt:
        marker = PREFIX + "interrupted"
    except (Exception, SystemExit):
        marker = PREFIX + "launcher_failed"
    print(marker, flush=True)
    return 0 if marker == PASS else 1


if __name__ == "__main__":
    sys.exit(main())
