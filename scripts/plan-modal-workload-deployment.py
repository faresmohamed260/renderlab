"""Validate and print a Modal workload deployment plan without changing Modal."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys

WORKSPACE_ID = "ac-88wJ5dCXYBOywnXXaGmUoV"
SAFE = re.compile(r"[a-z][a-z0-9-]{0,62}")
ACTIVE_TARGETS = (
    ("renderlab-image-generation", "workers/fibo-studio/modal_native_renderer.py"),
    ("renderlab-generation-gateway", "workers/fibo-studio/modal_native_production.py"),
)
INACTIVE_TARGETS = (
    ("renderlab-video-generation", "workers/fibo-studio/modal_video_generation.py"),
    ("renderlab-image-tools", "workers/fibo-studio/modal_image_tools.py"),
    ("renderlab-video-tools", "workers/fibo-studio/modal_video_tools.py"),
)


def parser():
    result = argparse.ArgumentParser()
    result.add_argument("--workspace-id", required=True)
    result.add_argument("--environment", required=True)
    result.add_argument("--gateway-secret", required=True)
    result.add_argument("--dispatcher-secret", required=True)
    result.add_argument("--monitor-secret", required=True)
    result.add_argument("--worker-secret", required=True)
    result.add_argument("--model-volume", required=True)
    result.add_argument("--isolated", action="store_true", help="Require an isolated environment and provider read-back")
    result.add_argument(
        "--include-inactive",
        action="store_true",
        help="Include the three CPU-only inactive workload shells required by ADR-005",
    )
    result.add_argument("--resource-readback", type=Path, help="Name-only provider inventory for the selected target")
    return result


def plan(values):
    if values.workspace_id != WORKSPACE_ID:
        raise ValueError("Unexpected Modal workspace")
    resources = (
        values.environment, values.gateway_secret, values.dispatcher_secret,
        values.monitor_secret, values.worker_secret, values.model_volume,
    )
    if any(not SAFE.fullmatch(value) for value in resources):
        raise ValueError("Environment resources must be explicit safe names")
    secrets = [values.gateway_secret, values.dispatcher_secret, values.monitor_secret, values.worker_secret]
    if len(set(secrets)) != len(secrets):
        raise ValueError("Gateway, dispatcher, monitor and worker require distinct secrets")
    if values.isolated and values.environment == "main":
        raise ValueError("Isolated qualification cannot target the production environment")
    if values.isolated and values.resource_readback is None:
        raise ValueError("Isolated qualification requires provider resource read-back")
    if values.resource_readback is not None:
        inventory = json.loads(values.resource_readback.read_text(encoding="utf-8-sig"))
        if not isinstance(inventory, dict) or (inventory.get("workspaceId"), inventory.get("environment")) != (
            values.workspace_id, values.environment,
        ):
            raise ValueError("Provider read-back does not match the requested workspace and environment")
        for key, required in (("secrets", secrets), ("volumes", [values.model_volume])):
            names = inventory.get(key)
            if not isinstance(names, list) or any(not isinstance(name, str) for name in names):
                raise ValueError(f"Provider read-back is missing the {key} inventory")
            if any(name not in names for name in required):
                raise ValueError(f"Required {key} are absent from the selected environment")
    exports = {
        "RENDERLAB_MODAL_ENVIRONMENT": values.environment,
        "RENDERLAB_MODAL_GATEWAY_SECRET": values.gateway_secret,
        "RENDERLAB_MODAL_DISPATCHER_SECRET": values.dispatcher_secret,
        "RENDERLAB_MODAL_MONITOR_SECRET": values.monitor_secret,
        "RENDERLAB_MODAL_WORKER_SECRET": values.worker_secret,
        "RENDERLAB_MODAL_MODEL_VOLUME": values.model_volume,
    }
    targets = ACTIVE_TARGETS + (INACTIVE_TARGETS if values.include_inactive else ())
    return {
        "workspaceId": values.workspace_id,
        "environment": values.environment,
        "requiredResources": {
            "secrets": secrets,
            "volumes": [values.model_volume],
        },
        "environmentVariables": exports,
        "apps": [app_name for app_name, _ in targets],
        "commands": [f"python -m modal deploy -e {values.environment} {entrypoint}" for _, entrypoint in targets],
        "validatedResourceReadback": values.resource_readback is not None,
        "mutatesProvider": False,
    }


def main():
    try:
        print(json.dumps(plan(parser().parse_args()), indent=2))
    except (OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(2) from error


if __name__ == "__main__":
    main()
