"""Shared GPU renderer for the native FIBO gateways and smoke test."""
import os
import sys
from pathlib import Path
from uuid import UUID, uuid4

import modal

from workload_environment import workload_runtime_env

app = modal.App("renderlab-image-generation")
COMFY = "/opt/ComfyUI"
REVISION = "dea870e1a36614b3614c0008a820734d0fecdf4f"
MODELS = "/opt/fibo-models"
_runner = None
runtime_env = workload_runtime_env(
    "RENDERLAB_MODAL_WORKER_SECRET", "RENDERLAB_MODAL_MODEL_VOLUME",
)
environment = runtime_env["RENDERLAB_MODAL_ENVIRONMENT"]
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .pip_install("psycopg[binary]==3.2.13")
    .run_commands(
        f"git init {COMFY} && git -C {COMFY} fetch --depth=1 https://github.com/Comfy-Org/ComfyUI.git {REVISION} && git -C {COMFY} checkout --detach FETCH_HEAD",
        "python -m pip install --index-url https://download.pytorch.org/whl/cu128 torch==2.10.0 torchvision==0.25.0",
        f"python -m pip install -r {COMFY}/requirements.txt && python -m pip check",
    )
    .add_local_file(str(Path(__file__).with_name("native_graph.py")), "/opt/renderlab/native_graph.py")
    .add_local_file(str(Path(__file__).with_name("native_mask.py")), "/opt/renderlab/native_mask.py")
    .add_local_file(str(Path(__file__).with_name("native_generated_vgl.py")), "/opt/renderlab/native_generated_vgl.py")
    .add_local_file(str(Path(__file__).with_name("dispatch_core.py")), "/opt/renderlab/dispatch_core.py")
    .add_local_file(str(Path(__file__).with_name("dispatch_supabase.py")), "/opt/renderlab/dispatch_supabase.py")
    .add_local_file(str(Path(__file__).with_name("workload_contract.py")), "/opt/renderlab/workload_contract.py")
    .add_local_file(str(Path(__file__).with_name("native_comfy_session.py")), "/opt/renderlab/native_comfy_session.py")
    .add_local_file(str(Path(__file__).with_name("native_fibo_adapter.py")), "/opt/renderlab/native_fibo_adapter.py")
    .add_local_python_source("workload_environment")
)


@app.function(image=image, gpu="A10", cpu=2, memory=16384, timeout=420, max_containers=1,
              scaledown_window=60, env=runtime_env,
              secrets=[modal.Secret.from_name(
                  runtime_env["RENDERLAB_MODAL_WORKER_SECRET"],
                  environment_name=environment,
              )],
              volumes={MODELS: modal.Volume.from_name(
                  runtime_env["RENDERLAB_MODAL_MODEL_VOLUME"],
                  environment_name=environment,
              )})
def render(*, prompt, seed, sources=(), width=0, height=0, steps=4,
           negative_prompt="", vgl="", mask=None, generate_vgl=False,
           dispatch_attempt_id=None, admission_deadline=None, model_binding=None):
    """Run one FIBO request using the private process for this GPU container."""
    global _runner
    import torch

    if "/opt/renderlab" not in sys.path:
        sys.path.insert(0, "/opt/renderlab")
    from native_comfy_session import ComfySession, UncleanComfyWorker
    from native_fibo_adapter import FiboAdapter
    from workload_contract import (
        FIBO_MODEL_KEY, FIBO_MODEL_VERSION, Operation, PRODUCTION_CATALOG, WorkloadRunner, WorkRequest,
    )

    operation = Operation.EDIT_IMAGE if sources else Operation.CREATE_IMAGE
    key, version = FIBO_MODEL_KEY, FIBO_MODEL_VERSION
    if model_binding is not None:
        key, version, intended_operation = model_binding
        if Operation(intended_operation) is not operation:
            raise ValueError("FIBO operation does not match its bound sources")
    attempt_id = uuid4().hex
    if dispatch_attempt_id is not None or admission_deadline is not None:
        if not isinstance(dispatch_attempt_id, str) or not admission_deadline:
            raise ValueError("Durable dispatch identity is incomplete")
        if str(UUID(dispatch_attempt_id)) != dispatch_attempt_id:
            raise ValueError("Invalid durable attempt identifier")
        from dispatch_supabase import begin_generation_attempt
        call_id = modal.current_function_call_id() if model_binding is not None else None
        begin_generation_attempt(dispatch_attempt_id, admission_deadline, call_id)
        attempt_id = dispatch_attempt_id

    if not torch.cuda.is_available():
        raise RuntimeError("Expected a Modal CUDA GPU")
    if _runner is None:
        _runner = WorkloadRunner(PRODUCTION_CATALOG, {"fibo": FiboAdapter(ComfySession(COMFY, MODELS))})

    request = WorkRequest(attempt_id, key, version, operation, {
        "prompt": prompt, "seed": seed, "sources": sources, "width": width, "height": height,
        "steps": steps, "negative_prompt": negative_prompt, "vgl": vgl, "mask": mask,
        "generate_vgl": generate_vgl,
    })
    try:
        result = _runner.run(request)
    except UncleanComfyWorker:
        # An unreaped child or workspace makes this container unsafe to reuse.
        print(f"renderlab attempt={attempt_id} phase=container-recycle", flush=True)
        os._exit(1)
    if generate_vgl:
        return {"image_png": result.content, "generated_vgl": result.metadata["generated_vgl"]}
    return result.content
