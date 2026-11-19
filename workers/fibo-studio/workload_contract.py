"""Model-neutral workload contracts used by RenderLab's Modal workers.

This module deliberately has no Modal dependency so catalog selection and worker
semantics can be tested in credential-free CI.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Mapping, Protocol


class Operation(str, Enum):
    CREATE_IMAGE = "create-image"
    EDIT_IMAGE = "edit-image"


class BackendKind(str, Enum):
    COMFYUI = "comfyui"
    DIRECT_PYTHON = "direct-python"


@dataclass(frozen=True)
class ModelEntry:
    key: str
    version: str
    operations: frozenset[Operation]
    adapter: str
    backend: BackendKind
    active: bool = True


@dataclass(frozen=True)
class WorkRequest:
    attempt_id: str
    model_key: str
    model_version: str
    operation: Operation
    payload: Mapping[str, Any]


@dataclass(frozen=True)
class WorkResult:
    attempt_id: str
    content: bytes
    content_type: str
    metadata: Mapping[str, Any]


class WorkloadAdapter(Protocol):
    def execute(self, request: WorkRequest) -> WorkResult: ...


class ModelCatalog:
    def __init__(self, entries: tuple[ModelEntry, ...], *, default_key: str):
        if not entries:
            raise ValueError("The model catalog cannot be empty")
        indexed = {(entry.key, entry.version): entry for entry in entries}
        if len(indexed) != len(entries):
            raise ValueError("Model catalog keys and versions must be unique")
        defaults = [entry for entry in entries if entry.key == default_key and entry.active]
        if len(defaults) != 1:
            raise ValueError("The default model must resolve to one active version")
        self._entries = indexed
        self.default_key = default_key

    def resolve(self, *, key: str | None, version: str | None, operation: Operation) -> ModelEntry:
        selected_key = key or self.default_key
        candidates = [
            entry for (entry_key, _), entry in self._entries.items()
            if entry_key == selected_key and entry.active
        ]
        if version is not None:
            candidates = [entry for entry in candidates if entry.version == version]
        if len(candidates) != 1:
            raise ValueError("Unknown or inactive model version")
        entry = candidates[0]
        if operation not in entry.operations:
            raise ValueError("The selected model does not support this operation")
        return entry


FIBO_MODEL_KEY = "fibo-2.0-turbo"
FIBO_MODEL_VERSION = "bria-fibo-2.0-turbo"

PRODUCTION_CATALOG = ModelCatalog((
    ModelEntry(
        key=FIBO_MODEL_KEY,
        version=FIBO_MODEL_VERSION,
        operations=frozenset((Operation.CREATE_IMAGE, Operation.EDIT_IMAGE)),
        adapter="fibo",
        backend=BackendKind.COMFYUI,
    ),
), default_key=FIBO_MODEL_KEY)


class WorkloadRunner:
    """Shared adapter dispatch with immutable catalog binding validation."""

    def __init__(self, catalog: ModelCatalog, adapters: Mapping[str, WorkloadAdapter]):
        self.catalog = catalog
        self.adapters = adapters

    def run(self, request: WorkRequest) -> WorkResult:
        entry = self.catalog.resolve(
            key=request.model_key,
            version=request.model_version,
            operation=request.operation,
        )
        adapter = self.adapters.get(entry.adapter)
        if adapter is None:
            raise RuntimeError("The selected model adapter is unavailable")
        result = adapter.execute(request)
        if result.attempt_id != request.attempt_id:
            raise RuntimeError("Worker result correlation does not match its attempt")
        return result
