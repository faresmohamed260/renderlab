"""Private provider contract for the native FIBO worker candidate."""
import base64
import binascii
import hashlib
import hmac
import json
import re

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from native_graph import build_graph

MAX_BODY = 46 * 1024 * 1024
MAX_IMAGES = 32 * 1024 * 1024
CALL_ID = re.compile(r"fc-[A-Za-z0-9]{16,64}")
FIELDS = {"prompt", "seed", "width", "height", "steps", "negative_prompt", "vgl", "images"}


def validate_payload(payload):
    if not isinstance(payload, dict) or payload.keys() - FIELDS:
        raise ValueError("Unsupported FIBO request fields")
    images = payload.get("images", [])
    if not isinstance(images, list) or len(images) > 4:
        raise ValueError("Expected up to four source images")
    options = {key: payload[key] for key in FIELDS - {"images"} if key in payload}
    build_graph(**options, images=[f"{slot:032x}.png" for slot in range(len(images))])
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
    return {**options, "sources": sources}


def create_gateway(*, spawn, poll, cancel, signing_key, expired_errors):
    if not isinstance(signing_key, bytes) or len(signing_key) < 32:
        raise RuntimeError("FIBO gateway requires a dedicated signing key")
    api = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)

    def signature(call_id):
        return hmac.new(signing_key, b"renderlab-fibo-v1:" + call_id.encode(), hashlib.sha256).hexdigest()

    def unwrap(token):
        call_id, sep, tag = token.partition(".")
        if not sep or not CALL_ID.fullmatch(call_id) or not re.fullmatch(r"[0-9a-f]{64}", tag):
            raise HTTPException(404, "Unknown FIBO job")
        if not hmac.compare_digest(signature(call_id), tag):
            raise HTTPException(404, "Unknown FIBO job")
        return call_id

    @api.middleware("http")
    async def prevent_caching(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "private, no-store"
        return response

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
            call_id = await run_in_threadpool(spawn, **inputs)
            if not CALL_ID.fullmatch(call_id):
                raise RuntimeError("Malformed Modal call ID")
        except Exception as exc:
            raise HTTPException(503, "FIBO submission was not confirmed") from exc
        return {"call_id": f"{call_id}.{signature(call_id)}", "worker_state": "queued"}

    @api.get("/jobs/{token}")
    async def status(token: str):
        call_id = unwrap(token)
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
        if not isinstance(result, bytes) or not result.startswith(b"\x89PNG\r\n\x1a\n") or len(result) > 16 * 1024 * 1024:
            raise HTTPException(502, "Invalid FIBO output")
        return Response(result, media_type="image/png")

    @api.delete("/jobs/{token}")
    async def remove(token: str):
        call_id = unwrap(token)
        try:
            await run_in_threadpool(cancel, call_id)
        except expired_errors as exc:
            raise HTTPException(410, "FIBO job expired") from exc
        except Exception as exc:
            raise HTTPException(503, "FIBO cancellation was not confirmed") from exc
        return {"status": "cancelled"}

    return api
