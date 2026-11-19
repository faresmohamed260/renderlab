import unittest

from workload_environment import WORKSPACE_ID, WorkloadEnvironment


def configured(environment="qualification"):
    return WorkloadEnvironment.from_values(
        workspace_id=WORKSPACE_ID,
        environment=environment,
        gateway_secret="renderlab-gateway-qualification",
        dispatcher_secret="renderlab-dispatcher-qualification",
        model_volume="renderlab-fibo-models-qualification",
    )


class WorkloadEnvironmentTest(unittest.TestCase):
    def test_explicit_environment_is_accepted(self):
        target = configured()
        target.assert_same_environment("qualification")

    def test_wrong_workspace_missing_resource_and_cross_environment_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "workspace"):
            WorkloadEnvironment.from_values(
                workspace_id="ac-other", environment="qualification",
                gateway_secret="gateway", dispatcher_secret="dispatcher", model_volume="models",
            )
        with self.assertRaisesRegex(ValueError, "explicit"):
            WorkloadEnvironment.from_values(
                workspace_id=WORKSPACE_ID, environment="qualification",
                gateway_secret="", dispatcher_secret="dispatcher", model_volume="models",
            )
        with self.assertRaisesRegex(ValueError, "Cross-environment"):
            configured().assert_same_environment("main")


if __name__ == "__main__":
    unittest.main()
