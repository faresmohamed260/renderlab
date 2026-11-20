"""Private provider contract for the native FIBO worker candidate."""
import base64
import binascii
import hashlib
import hmac
from io import BytesIO
import json
import re

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from native_graph import build_graph
from native_generated_vgl import validate_generated_vgl

MAX_BODY = 46 * 1024 * 1024
MAX_IMAGES = 32 * 1024 * 1024
MAX_MASK = 8 * 1024 * 1024
PNG_HEADER = bytes.fromhex("89504e470d0a1a0a")
CALL_ID = re.compile(r"fc-[A-Za-z0-9]{16,64}")
JOB_HANDLE_HEADER = "X-RenderLab-Job-Handle"
FIELDS = {"prompt", "seed", "width", "height", "steps", "negative_prompt", "vgl", "images", "mask", "generate_vgl"}


def validated_worker_result(result):
    generated_vgl = None
    if type(result) is dict:
        if set(result) != {"image_png", "generated_vgl"}:
            raise ValueError("Unexpected generated VGL result fields")
        generated_vgl = validate_generated_vgl(result["generated_vgl"])
        result = result["image_png"]
    if type(result) is not bytes or not result.startswith(PNG_HEADER) or len(result) > 16 * 1024 * 1024:
        raise ValueError("Invalid FIBO image result")
    return result, generated_vgl


def validate_payload(payload):
    if not isinstance(payload, dict) or payload.keys() - FIELDS:
        raise ValueError("Unsupported FIBO request fields")
    images = payload.get("images", [])
    if not isinstance(images, list) or len(images) > 4:
        raise ValueError("Expected up to four source images")
    options = {key: payload[key] for key in FIELDS - {"images", "mask"} if key in payload}
    staged_names = [f"{slot:032x}.png" for slot in range(len(images))]
    mask = None
    if "mask" in payload:
        if len(images) != 1:
            raise ValueError("Masked editing requires exactly one source image")
        encoded = payload["mask"]
        if not isinstance(encoded, str) or len(encoded) > 4 * ((MAX_MASK + 2) // 3):
            raise ValueError("Invalid mask size")
        mask = base64.b64decode(encoded, validate=True)
        if not 0 < len(mask) <= MAX_MASK or not mask.startswith(PNG_HEADER):
            raise ValueError("Expected a bounded PNG mask")
    sources = []
    for encoded in images:
        if not isinstance(encoded, str) or len(encoded) > 4 * ((16 * 1024 * 1024 + 2) // 3):
            raise ValueError("Invalid source size")
        data = base64.b64decode(encoded, validate=True)
        if not 0 < len(data) <= 16 * 1024 * 1024:
            raise ValueError("Invalid source size")
        sources.append(data)
    if sum(map(len, sources)) > MAX_IMAGES:
        raise ValueError("Combined input limit exceeded")
    from PIL import Image

    source_dimensions = None
    try:
        for data in sources:
            with Image.open(BytesIO(data), formats=["PNG", "JPEG", "WEBP"]) as image:
                if image.width * image.height > 16_777_216 or getattr(image, "is_animated", False):
                    raise ValueError("Source image exceeds the pixel limit or is animated")
                if source_dimensions is None and mask is not None:
                    orientation = image.getexif().get(274)
                    source_dimensions = (image.height, image.width) if orientation in (5, 6, 7, 8) else image.size
                image.load()
        if mask is not None:
            from native_mask import normalize_mask_bytes
            normalize_mask_bytes(mask, source_dimensions)
    except (OSError, Image.DecompressionBombError, SyntaxError) as exc:
        raise ValueError("Invalid or unsupported FIBO media") from exc

    original_dimensions = (options.get("width", 0), options.get("height", 0)) == (0, 0)
    build_graph(**options, images=staged_names, mask=f"{len(images):032x}.png" if mask is not None else None,
                source_dimensions=source_dimensions if original_dimensions else None)
    return {**options, "sources": sources, **({"mask": mask} if mask is not None else {})}


def call_handle_signer(signing_key):
    if not isinstance(signing_key, bytes) or len(signing_key) < 32:
        raise RuntimeError("FIBO gateway requires a dedicated signing key")

    def sign(call_id):
        if not isinstance(call_id, str) or not CALL_ID.fullmatch(call_id):
            raise ValueError("Malformed Modal call ID")
        signature = hmac.new(signing_key, b"renderlab-fibo-v1:" + call_id.encode(), hashlib.sha256).hexdigest()
        return f"{call_id}.{signature}"

    return sign


def create_gateway(*, spawn, poll, cancel, signing_key, expired_errors, wake_dispatcher=None,
                   allow_direct_submit=True):
    sign_call = call_handle_signer(signing_key)
    api = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)

    def unwrap(token):
        call_id, sep, tag = token.partition(".")
        if not sep or not CALL_ID.fullmatch(call_id) or not re.fullmatch(r"[0-9a-f]{64}", tag):
            raise HTTPException(404, "Unknown FIBO job")
        if not hmac.compare_digest(sign_call(call_id), token):
            raise HTTPException(404, "Unknown FIBO job")
        return call_id

    @api.middleware("http")
    async def prevent_caching(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "private, no-store"
        return response

    if allow_direct_submit:
        @api.post("/jobs/fibo", status_code=202)
        async def submit(request: Request):
            if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
                raise HTTPException(415, "Expected JSON")
            raw = bytearray()
            async for chunk in request.stream():
                if len(raw) + len(chunk) > MAX_BODY:
                    raise HTTPException(413, "FIBO request exceeds the byte limit")
                raw.extend(chunk)
            try:
                inputs = await run_in_threadpool(lambda: validate_payload(json.loads(raw)))
            except (ValueError, TypeError, binascii.Error, RecursionError) as exc:
                raise HTTPException(422, "Invalid or unsupported FIBO request") from exc
            try:
                call_id = sign_call(await run_in_threadpool(spawn, **inputs))
            except Exception as exc:
                raise HTTPException(503, "FIBO submission was not confirmed") from exc
            return {"call_id": call_id, "worker_state": "queued"}

    else:
        @api.post("/jobs/fibo")
        async def reject_direct_submit():
            raise HTTPException(405, "FIBO dispatch requires the durable queue")

    if wake_dispatcher is not None:
        @api.post("/dispatch/wake", status_code=202)
        async def wake():
            try:
                await run_in_threadpool(wake_dispatcher)
            except Exception as exc:
                raise HTTPException(503, "Dispatcher wake was not confirmed") from exc
            return {"status": "accepted"}

    @api.get("/jobs")
    async def status(request: Request):
        call_id = unwrap(request.headers.get(JOB_HANDLE_HEADER, ""))
        try:
            result = await run_in_threadpool(poll, call_id)
        except TimeoutError:
            return JSONResponse({"worker_state": "generating"}, status_code=202)
        except expired_errors as exc:
            raise HTTPException(410, "FIBO result expired") from exc
        except ValueError as exc:
            raise HTTPException(422, "FIBO rejected the render inputs") from exc
        except Exception as exc:
            raise HTTPException(500, "FIBO job failed or could not be read") from exc
        try:
            image_bytes, _ = validated_worker_result(result)
        except ValueError as exc:
            raise HTTPException(502, "Invalid FIBO output") from exc
        return Response(image_bytes, media_type="image/png")

    @api.get("/jobs/vgl")
    async def generated_vgl(request: Request):
        call_id = unwrap(request.headers.get(JOB_HANDLE_HEADER, ""))
        try:
            result = await run_in_threadpool(poll, call_id)
        except TimeoutError:
            return JSONResponse({"worker_state": "generating"}, status_code=202)
        except expired_errors as exc:
            raise HTTPException(410, "FIBO result expired") from exc
        except ValueError as exc:
            raise HTTPException(422, "FIBO rejected the render inputs") from exc
        except Exception as exc:
            raise HTTPException(500, "FIBO job failed or could not be read") from exc
        try:
            _, caption = validated_worker_result(result)
        except ValueError as exc:
            raise HTTPException(502, "Invalid generated FIBO VGL") from exc
        if caption is None:
            raise HTTPException(404, "This FIBO job does not have generated VGL")
        return JSONResponse({"vgl": caption})

    @api.delete("/jobs")
    async def remove(request: Request):
        call_id = unwrap(request.headers.get(JOB_HANDLE_HEADER, ""))
        try:
            await run_in_threadpool(cancel, call_id)
        except expired_errors as exc:
            raise HTTPException(410, "FIBO job expired") from exc
        except Exception as exc:
            raise HTTPException(503, "FIBO cancellation was not confirmed") from exc
        return {"status": "cancelled"}

    return api
