"""RenderLab production FIBO gateway; admission remains owned by RenderLab."""
import json
import os

import modal

from workload_environment import APP_NAMES, workload_runtime_env

app = modal.App(APP_NAMES["gateway"])
runtime_env = workload_runtime_env(
    "RENDERLAB_MODAL_DISPATCHER_SECRET", "RENDERLAB_MODAL_GATEWAY_SECRET",
    "RENDERLAB_MODAL_MONITOR_SECRET",
)
environment = runtime_env["RENDERLAB_MODAL_ENVIRONMENT"]

gateway_image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "fastapi==0.137.2", "httpx==0.28.1", "psycopg[binary]==3.2.13", "Pillow==12.2.0"
)
gateway_image = gateway_image.add_local_python_source(
    "dispatch_core", "dispatch_monitor", "dispatch_supabase", "modal_dispatch_backend", "native_gateway", "native_graph",
    "native_generated_vgl", "native_mask", "workload_contract", "workload_environment"
)


gateway_secret = modal.Secret.from_name(
    runtime_env["RENDERLAB_MODAL_GATEWAY_SECRET"],
    environment_name=environment,
)


def image_render():
    return modal.Function.from_name(APP_NAMES["image"], "render", environment_name=environment)


dispatcher_secret = modal.Secret.from_name(
    runtime_env["RENDERLAB_MODAL_DISPATCHER_SECRET"],
    environment_name=environment,
)

monitor_secret = modal.Secret.from_name(
    runtime_env["RENDERLAB_MODAL_MONITOR_SECRET"],
    environment_name=environment,
)


@app.function(image=gateway_image, env=runtime_env, secrets=[dispatcher_secret, gateway_secret], schedule=modal.Cron("* * * * *"))
def dispatch_tick(trigger="scheduled"):
    from dispatch_core import Dispatcher
    from dispatch_supabase import SupabaseDispatchStore
    from modal_dispatch_backend import ModalImageBackend
    from native_gateway import call_handle_signer

    sign_call = call_handle_signer(os.environ.get("RENDERLAB_FIBO_CALL_SIGNING_KEY", "").encode())
    store = SupabaseDispatchStore()
    summary = Dispatcher(store, {"fibo": ModalImageBackend(store, image_render(), sign_call)}).tick().__dict__
    if trigger not in ("scheduled", "wake", "manual"):
        trigger = "manual"
    store.record_heartbeat(environment=environment, trigger=trigger, summary=summary)
    print(json.dumps({"event": "renderlab.dispatch-tick", "trigger": trigger, **summary}), flush=True)
    return summary


@app.function(image=gateway_image, env=runtime_env, secrets=[monitor_secret], schedule=modal.Cron("*/5 * * * *"))
def monitor_tick():
    from dispatch_monitor import monitor_dispatch_health_direct

    summary = monitor_dispatch_health_direct(
        os.environ.get("RENDERLAB_SUPABASE_URL", ""),
        os.environ.get("RENDERLAB_SUPABASE_SERVICE_ROLE_KEY", ""),
        os.environ.get("RENDERLAB_RESEND_API_KEY", ""),
    )
    print(json.dumps(summary), flush=True)
    return summary


@app.function(image=gateway_image, env=runtime_env, secrets=[gateway_secret])
@modal.asgi_app(requires_proxy_auth=True)
def web():
    from native_gateway import create_gateway

    render = image_render()

    return create_gateway(
        spawn=lambda **payload: render.spawn(**payload).object_id,
        poll=lambda call_id: modal.FunctionCall.from_id(call_id).get(timeout=0),
        cancel=lambda call_id: modal.FunctionCall.from_id(call_id).cancel(terminate_containers=True),
        signing_key=os.environ.get("RENDERLAB_FIBO_CALL_SIGNING_KEY", "").encode(),
        expired_errors=(modal.exception.OutputExpiredError, modal.exception.NotFoundError),
        wake_dispatcher=lambda: dispatch_tick.spawn(trigger="wake").object_id,
        allow_direct_submit=False,
    )
