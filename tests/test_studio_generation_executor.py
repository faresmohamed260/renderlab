from __future__ import annotations

from types import SimpleNamespace

from packages.generation_core.executor import StudioGenerationExecutor


class CancellingQueue:
    def __init__(self) -> None:
        self.get_calls = 0
        self.completed = None

    def claim(self, *_args, **_kwargs):
        return {"queue_id": "studio-job-1", "payload": {"generation_id": "generation-1"}, "lease_token": "lease", "cancellation_requested_at_ms": 0}

    def get(self, _queue_id):
        self.get_calls += 1
        return {"cancellation_requested_at_ms": 0 if self.get_calls == 1 else 123}

    def complete(self, *_args, **kwargs):
        self.completed = kwargs


class RecordingStore:
    def __init__(self) -> None:
        self.updates = []
        self.events = []

    def get_generation(self, _generation_id):
        return {"id": "generation-1", "job_id": "job-1", "workflow_id": "z-image-turbo", "parameters": {}, "prompt": "test"}

    def update_generation(self, _generation_id, **payload):
        self.updates.append(payload)

    def add_event(self, _job_id, **payload):
        self.events.append(payload)


def test_cancellation_guard_never_enters_generating_after_request() -> None:
    queue = CancellingQueue()
    store = RecordingStore()
    registry = SimpleNamespace(get=lambda _workflow_id: SimpleNamespace(id="z-image-turbo"))
    executor = StudioGenerationExecutor(persistence=SimpleNamespace(execution_queue=queue), store=store, registry=registry)

    executor.process_one()

    assert [item["phase"] for item in store.updates] == ["Preparing", "Loading model", "Cancelled"]
    assert all(item["phase"] != "Generating" for item in store.events)
    assert queue.completed["status"] == "cancelled"


def test_provider_error_after_cancellation_is_recorded_as_cancelled() -> None:
    queue = CancellingQueue()
    store = RecordingStore()

    def fail_after_first_guard(_workflow_id):
        raise RuntimeError("provider stopped after interrupt")

    executor = StudioGenerationExecutor(
        persistence=SimpleNamespace(execution_queue=queue),
        store=store,
        registry=SimpleNamespace(get=fail_after_first_guard),
    )

    executor.process_one()

    assert store.updates[-1]["status"] == "cancelled"
    assert store.updates[-1]["phase"] == "Cancelled"
    assert queue.completed["status"] == "cancelled"
