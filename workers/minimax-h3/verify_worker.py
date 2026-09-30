from pathlib import Path
import ast

source = Path(__file__).with_name("modal_app.py")
text = source.read_text(encoding="utf-8")
compile(text, str(source), "exec")
tree = ast.parse(text)

assert 'APP_NAME = "renderlab-minimax-h3-gateway"' in text
assert 'ECOSYSTEM_ID = "minimax-h3-dasiwa-4turbo"' in text
assert 'COMFYUI_COMMIT = "33ee2b36d2d6e8f25cfc796b774ca387917b98de"' in text
assert 'HF_REVISION = "e5eb578a89295337b8ff433a035929ce0279e0b6"' in text
assert 'MODEL_SHA256 = "56c52c7890c105308d28fe9c25c25fdb80e6cd6a54e2604d8af71732ba4ed74f"' in text
assert '"steps": 4' in text
assert '"sampler_name": "euler"' in text
assert '"scheduler": "simple"' in text
assert 'gpu="A10"' in text
assert "memory=65536" in text
assert '"--lowvram"' in text
assert '"/jobs/video"' in text
assert text.count('"/jobs/{call_id}"') == 2
assert '"/jobs/{call_id}/poster"' in text
assert 'SUPPORTED_RESOLUTIONS = {"480p": 480, "720p": 720}' in text
assert "modal.Secret.from_name(\"renderlab-civitai\")" in text

namespace: dict[str, object] = {"SUPPORTED_RESOLUTIONS": {"480p": 480, "720p": 720}}
for node in tree.body:
    if isinstance(node, ast.FunctionDef) and node.name in {"_aspect_dimensions", "_frame_count"}:
        exec(compile(ast.Module(body=[node], type_ignores=[]), str(source), "exec"), namespace)

assert namespace["_aspect_dimensions"]("16:9", "480p") == (864, 480)
assert namespace["_aspect_dimensions"]("9:16", "720p") == (704, 1280)
assert namespace["_frame_count"](5, 24) == 124
assert namespace["_frame_count"](10, 24) == 243
assert namespace["_frame_count"](15, 24) == 362

print("MiniMax H3 worker offline contract verification passed.")
