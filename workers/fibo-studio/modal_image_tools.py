"""Inactive image-tools workload shell; readiness only, with no endpoint or schedule."""
import modal

from workload_environment import APP_NAMES

app = modal.App(APP_NAMES["image-tools"])


@app.function()
def readiness():
    return {"app": APP_NAMES["image-tools"], "state": "inactive"}
