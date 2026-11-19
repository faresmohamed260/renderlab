import unittest

from workload_contract import (
    BackendKind,
    FIBO_MODEL_KEY,
    FIBO_MODEL_VERSION,
    ModelCatalog,
    ModelEntry,
    Operation,
    PRODUCTION_CATALOG,
    WorkRequest,
    WorkResult,
    WorkloadRunner,
)


class Adapter:
    def __init__(self, label):
        self.label = label
        self.calls = []

    def execute(self, request):
        self.calls.append(request)
        return WorkResult(request.attempt_id, self.label.encode(), "image/png", {})


class WorkloadContractTest(unittest.TestCase):
    def test_production_catalog_is_fibo_only_and_defaulted(self):
        selected = PRODUCTION_CATALOG.resolve(key=None, version=None, operation=Operation.CREATE_IMAGE)
        self.assertEqual((selected.key, selected.version), (FIBO_MODEL_KEY, FIBO_MODEL_VERSION))
        with self.assertRaisesRegex(ValueError, "Unknown or inactive"):
            PRODUCTION_CATALOG.resolve(key="flux", version=None, operation=Operation.CREATE_IMAGE)

    def test_catalog_rejects_unknown_version_operation_and_inactive_backend(self):
        catalog = ModelCatalog((
            ModelEntry("alpha", "v1", frozenset((Operation.CREATE_IMAGE,)), "a", BackendKind.COMFYUI),
            ModelEntry("beta", "v2", frozenset((Operation.EDIT_IMAGE,)), "b", BackendKind.DIRECT_PYTHON, False),
        ), default_key="alpha")
        with self.assertRaisesRegex(ValueError, "Unknown or inactive"):
            catalog.resolve(key="alpha", version="v2", operation=Operation.CREATE_IMAGE)
        with self.assertRaisesRegex(ValueError, "does not support"):
            catalog.resolve(key="alpha", version="v1", operation=Operation.EDIT_IMAGE)
        with self.assertRaisesRegex(ValueError, "Unknown or inactive"):
            catalog.resolve(key="beta", version="v2", operation=Operation.EDIT_IMAGE)

    def test_shared_runner_selects_two_synthetic_adapters_and_preserves_binding(self):
        catalog = ModelCatalog((
            ModelEntry("alpha", "v1", frozenset((Operation.CREATE_IMAGE,)), "comfy", BackendKind.COMFYUI),
            ModelEntry("beta", "v2", frozenset((Operation.CREATE_IMAGE,)), "python", BackendKind.DIRECT_PYTHON),
        ), default_key="alpha")
        comfy, direct = Adapter("comfy"), Adapter("direct")
        runner = WorkloadRunner(catalog, {"comfy": comfy, "python": direct})
        first = runner.run(WorkRequest("attempt-1", "alpha", "v1", Operation.CREATE_IMAGE, {}))
        second = runner.run(WorkRequest("attempt-2", "beta", "v2", Operation.CREATE_IMAGE, {}))
        self.assertEqual((first.content, second.content), (b"comfy", b"direct"))
        self.assertEqual(len(comfy.calls), 1)
        self.assertEqual(len(direct.calls), 1)


if __name__ == "__main__":
    unittest.main()
