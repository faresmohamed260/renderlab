"""FIBO-specific graph and bounded media handling for the shared worker."""
from io import BytesIO
from uuid import uuid4

from native_generated_vgl import validate_generated_vgl
from native_graph import build_graph
from native_mask import normalize_mask_bytes
from workload_contract import WorkRequest, WorkResult


class FiboAdapter:
    def __init__(self, session):
        self.session = session

    def execute(self, request: WorkRequest) -> WorkResult:
        from PIL import Image, ImageOps

        options = dict(request.payload)
        sources = options.pop("sources", ())
        mask = options.pop("mask", None)
        width, height = options.get("width", 0), options.get("height", 0)
        generate_vgl = options.get("generate_vgl", False)
        if not isinstance(sources, (list, tuple)) or len(sources) > 4:
            raise ValueError("Expected zero to four source images")
        if any(type(item) is not bytes or not 0 < len(item) <= 16 * 1024 * 1024 for item in sources):
            raise ValueError("Invalid source image byte size")
        if sum(map(len, sources)) > 32 * 1024 * 1024:
            raise ValueError("Source images exceed the combined limit")
        if mask is not None and len(sources) != 1:
            raise ValueError("A mask requires exactly one source image")
        names = [uuid4().hex + ".png" for _ in sources]
        mask_name = uuid4().hex + ".png" if mask is not None else None

        def stage(files):
            source_size = None
            for name, payload in zip(names, sources):
                with Image.open(BytesIO(payload), formats=["PNG", "JPEG", "WEBP"]) as source:
                    if source.width * source.height > 16_777_216 or getattr(source, "is_animated", False):
                        raise ValueError("Source image exceeds the pixel limit or is animated")
                    normalized = ImageOps.exif_transpose(source).convert("RGB")
                    if source_size is None:
                        source_size = normalized.size
                    normalized.save(files.input / name)
            if mask_name is not None:
                (files.input / mask_name).write_bytes(normalize_mask_bytes(mask, source_size))
            graph = build_graph(
                **options, images=[f"{files.key}/{name}" for name in names],
                mask=f"{files.key}/{mask_name}" if mask_name is not None else None,
                source_dimensions=source_size if mask_name is not None and (width, height) == (0, 0) else None,
            )
            for node in graph.values():
                inputs = node["inputs"]
                if "filename_prefix" in inputs:
                    inputs["filename_prefix"] = f"{files.key}/{inputs['filename_prefix']}"
            return graph

        def collect(files, record):
            generated_vgl = None
            if generate_vgl:
                generated = record["outputs"].get("auto_vgl_result", {}).get("text")
                if not isinstance(generated, list) or len(generated) != 1:
                    raise ValueError("Generated VGL was not captured from native ComfyUI")
                generated_vgl = validate_generated_vgl(generated[0])
            result, = record["outputs"]["output"]["images"]
            output = (files.output.parent / result["subfolder"] / result["filename"]).resolve()
            if not output.is_relative_to(files.output) or output.stat().st_size > 16 * 1024 * 1024:
                raise RuntimeError("Unexpected FIBO output")
            with Image.open(output, formats=["PNG"]) as decoded:
                if decoded.width * decoded.height > 1536 * 1024 or (width and decoded.size != (width, height)):
                    raise RuntimeError("Unexpected FIBO output dimensions")
                decoded.load()
            metadata = {"generated_vgl": generated_vgl} if generate_vgl else {}
            return WorkResult(request.attempt_id, output.read_bytes(), "image/png", metadata)

        return self.session.run(stage, collect, request.attempt_id)
