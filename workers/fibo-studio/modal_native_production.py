"""RenderLab production FIBO gateway; admission remains owned by RenderLab."""
import os

import modal

from workload_environment import APP_NAMES

app = modal.App(APP_NAMES["gateway"])
gateway_image = modal.Image.debian_slim(python_version="3.12").pip_install("fastapi==0.137.2")
gateway_image = gateway_image.add_local_python_source(
    "native_gateway", "native_graph", "native_generated_vgl", "workload_environment"
)


def deployment_resource(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} must be explicit")
    return value


def image_render():
    environment = deployment_resource("RENDERLAB_MODAL_ENVIRONMENT")
    return modal.Function.from_name(APP_NAMES["image"], "render", environment_name=environment)


@app.function(image=gateway_image, secrets=[modal.Secret.from_name(
    deployment_resource("RENDERLAB_MODAL_GATEWAY_SECRET"),
    environment_name=deployment_resource("RENDERLAB_MODAL_ENVIRONMENT"),
)])
@modal.asgi_app(requires_proxy_auth=True)
def web():
    from native_gateway import create_gateway

    render = image_render()

    return create_gateway(
        spawn=lambda **payload: render.spawn(**payload).object_id,
        poll=lambda call_id: modal.FunctionCall.from_id(call_id).get(timeout=0),
        cancel=lambda call_id: modal.FunctionCall.from_id(call_id).cancel(terminate_containers=False),
        signing_key=os.environ.get("RENDERLAB_FIBO_CALL_SIGNING_KEY", "").encode(),
        expired_errors=(modal.exception.OutputExpiredError, modal.exception.NotFoundError),
    )
