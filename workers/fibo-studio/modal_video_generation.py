"""Inactive video workload shell; readiness only, with no endpoint or schedule."""
import modal

from workload_environment import APP_NAMES

app = modal.App(APP_NAMES["video"])
readiness_image = modal.Image.debian_slim(python_version="3.12").add_local_python_source(
    "workload_environment"
)


@app.function(image=readiness_image)
def readiness():
    return {"app": APP_NAMES["video"], "state": "inactive"}
