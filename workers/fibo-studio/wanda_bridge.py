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
if mode == "health":
    result = worker.health.spawn().get(timeout=130)
elif mode == "generate":
    result = worker.text_to_image.spawn(request["instruction"], request["seed"]).get(timeout=400)
elif mode == "edit":
    images = [base64.b64decode(data, validate=True) for data in request["images"]]
    result = worker.edit_image.spawn(images, request["instruction"], request["seed"]).get(timeout=400)
else:
    raise ValueError("Unsupported bridge operation")
if "png" in result:
    result["png"] = base64.b64encode(result["png"]).decode("ascii")
print(json.dumps(result))
