"""Fail-closed environment configuration for independently deployable Modal apps."""
from __future__ import annotations

from dataclasses import dataclass
import re


APP_NAMES = {
    "gateway": "renderlab-generation-gateway",
    "image": "renderlab-image-generation",
    "video": "renderlab-video-generation",
    "image-tools": "renderlab-image-tools",
    "video-tools": "renderlab-video-tools",
}
WORKSPACE_ID = "ac-88wJ5dCXYBOywnXXaGmUoV"
WORKSPACE_NAME = "faresmohamed260"
_SAFE_NAME = re.compile(r"[a-z][a-z0-9-]{0,62}")


@dataclass(frozen=True)
class WorkloadEnvironment:
    workspace_id: str
    environment: str
    gateway_secret: str
    dispatcher_secret: str
    worker_secret: str
    model_volume: str

    @classmethod
    def from_values(
        cls,
        *,
        workspace_id: str,
        environment: str,
        gateway_secret: str,
        dispatcher_secret: str,
        worker_secret: str,
        model_volume: str,
    ) -> "WorkloadEnvironment":
        values = (environment, gateway_secret, dispatcher_secret, worker_secret, model_volume)
        if workspace_id != WORKSPACE_ID:
            raise ValueError("Unexpected Modal workspace")
        if any(not value or not _SAFE_NAME.fullmatch(value) for value in values):
            raise ValueError("Modal environment resources must be explicit safe names")
        return cls(workspace_id, environment, gateway_secret, dispatcher_secret, worker_secret, model_volume)

    def assert_same_environment(self, resource_environment: str) -> None:
        if resource_environment != self.environment:
            raise ValueError("Cross-environment Modal resource reference rejected")
