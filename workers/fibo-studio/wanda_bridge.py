"""Private WANDA server-to-server bridge. Browser requests never carry a Modal credential."""
import base64
import json
import os
import sys

os.environ["MODAL_PROFILE"] = "faresmohamed260"
for key in ("MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET", "MODAL_ENVIRONMENT"):
    os.environ.pop(key, None)

import modal

worker = modal.Cls.from_name(
    "renderlab-fibo-studio", "FiboStudio", environment_name="main"
)()
request = json.load(sys.stdin)
mode = request["mode"]
steps = request.get("steps", 4)
# The default calls remain compatible with private worker v6.
render_options = {"steps": steps} if steps != 4 else {}
for key in ("negative_prompt", "json_instruction"):
    if request.get(key):
        render_options[key] = request[key]
if mode == "health":
    result = worker.health.spawn().get(timeout=130)
elif mode == "generate" and (request.get("extended") or render_options):
    encoded = request.get("inspiration")
    inspiration = base64.b64decode(encoded, validate=True) if encoded is not None else None
    result = worker.text_to_image_with_setup.spawn(
        request["instruction"], request["seed"], request["width"], request["height"], inspiration, **render_options
    ).get(timeout=400)
elif mode == "generate":
    result = worker.text_to_image.spawn(request["instruction"], request["seed"]).get(timeout=400)
elif mode == "edit":
    images = [base64.b64decode(data, validate=True) for data in request["images"]]
    if request.get("mask"):
        render_options["mask"] = base64.b64decode(request["mask"], validate=True)
    result = worker.edit_image.spawn(images, request["instruction"], request["seed"], **render_options).get(timeout=400)
else:
    raise ValueError("Unsupported bridge operation")
if "png" in result:
    result["png"] = base64.b64encode(result["png"]).decode("ascii")
print(json.dumps(result))
