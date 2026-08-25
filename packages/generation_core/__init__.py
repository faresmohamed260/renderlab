"""Capability-driven generation primitives shared by RenderLab integrations."""

from .contracts import (
    GenerationRequest,
    ManifestInput,
    ManifestParameter,
    WorkflowManifest,
)
from .registry import ManifestValidationError, WorkflowRegistry

__all__ = [
    "GenerationRequest",
    "ManifestInput",
    "ManifestParameter",
    "ManifestValidationError",
    "WorkflowManifest",
    "WorkflowRegistry",
]
