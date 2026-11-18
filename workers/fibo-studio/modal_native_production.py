"""RenderLab production FIBO gateway; admission remains owned by RenderLab."""
import os

import modal

from modal_native_smoke import app as render_app, render

app = modal.App("renderlab-fibo-native-gateway").include(render_app)
gateway_image = modal.Image.debian_slim(python_version="3.12").pip_install("fastapi==0.137.2")
gateway_image = gateway_image.add_local_python_source("native_gateway", "native_graph", "native_generated_vgl")


@app.function(image=gateway_image, secrets=[modal.Secret.from_name("renderlab-fibo-native-gateway")])
@modal.asgi_app(requires_proxy_auth=True)
def web():
    from native_gateway import create_gateway

    return create_gateway(
        spawn=lambda **payload: render.spawn(**payload).object_id,
        poll=lambda call_id: modal.FunctionCall.from_id(call_id).get(timeout=0),
        cancel=lambda call_id: modal.FunctionCall.from_id(call_id).cancel(terminate_containers=False),
        signing_key=os.environ.get("RENDERLAB_FIBO_CALL_SIGNING_KEY", "").encode(),
        expired_errors=(modal.exception.OutputExpiredError, modal.exception.NotFoundError),
    )
