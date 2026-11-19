"""Validate and print a Modal workload deployment plan without changing Modal."""
from __future__ import annotations

import argparse
import json
import re
import sys

WORKSPACE_ID = "ac-88wJ5dCXYBOywnXXaGmUoV"
SAFE = re.compile(r"[a-z][a-z0-9-]{0,62}")
ENTRYPOINTS = (
    "workers/fibo-studio/modal_native_renderer.py",
    "workers/fibo-studio/modal_native_production.py",
    "workers/fibo-studio/modal_video_generation.py",
    "workers/fibo-studio/modal_image_tools.py",
    "workers/fibo-studio/modal_video_tools.py",
)


def parser():
    result = argparse.ArgumentParser()
    result.add_argument("--workspace-id", required=True)
    result.add_argument("--environment", required=True)
    result.add_argument("--gateway-secret", required=True)
    result.add_argument("--dispatcher-secret", required=True)
    result.add_argument("--worker-secret", required=True)
    result.add_argument("--model-volume", required=True)
    return result


def plan(values):
    if values.workspace_id != WORKSPACE_ID:
        raise ValueError("Unexpected Modal workspace")
    resources = (values.environment, values.gateway_secret, values.dispatcher_secret, values.worker_secret, values.model_volume)
    if any(not SAFE.fullmatch(value) for value in resources):
        raise ValueError("Environment resources must be explicit safe names")
    exports = {
        "RENDERLAB_MODAL_ENVIRONMENT": values.environment,
        "RENDERLAB_MODAL_GATEWAY_SECRET": values.gateway_secret,
        "RENDERLAB_MODAL_DISPATCHER_SECRET": values.dispatcher_secret,
        "RENDERLAB_MODAL_WORKER_SECRET": values.worker_secret,
        "RENDERLAB_MODAL_MODEL_VOLUME": values.model_volume,
    }
    return {
        "workspaceId": values.workspace_id,
        "environment": values.environment,
        "requiredResources": {
            "secrets": [values.gateway_secret, values.dispatcher_secret, values.worker_secret],
            "volumes": [values.model_volume],
        },
        "environmentVariables": exports,
        "commands": [f"python -m modal deploy -e {values.environment} {entrypoint}" for entrypoint in ENTRYPOINTS],
        "mutatesProvider": False,
    }


def main():
    try:
        print(json.dumps(plan(parser().parse_args()), indent=2))
    except ValueError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(2) from error


if __name__ == "__main__":
    main()
