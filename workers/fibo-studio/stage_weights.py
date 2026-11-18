import hashlib
from pathlib import Path
import subprocess
import modal

REV = "4742d4bec410034142c8e65559e5f00c6f29eccb"
REPO = "https://huggingface.co/Comfy-Org/Fibo-2.0/resolve/"
FILES = {
    "diffusion_models/fibo2_edit_turbo_int8_convrot.safetensors": (8408562474, "1f6fa7c499191f405467123f655f11762661eaa5bd479d1da8f161398ef72c3b"),
    "text_encoders/qwen3vl_4b_int8_convrot.safetensors": (4858559240, "32de113cbf8282b02cbff0794b637b9d6676da09314a1db5a30bcea9bf4ee01c"),
    "vae/flux2-vae.safetensors": (336211292, "868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3"),
}
app = modal.App("renderlab-fibo-hf-stage")
volume = modal.Volume.from_name("renderlab-fibo-models", environment_name="main", create_if_missing=True)


@app.function(image=modal.Image.debian_slim(python_version="3.12").apt_install("curl", "ca-certificates"),
              volumes={"/weights": volume}, cpu=2, memory=4096, timeout=600, max_containers=1)
def stage():
    from concurrent.futures import ThreadPoolExecutor

    def download(item):
        name, (size, sha) = item
        final = Path("/weights") / name
        final.parent.mkdir(parents=True, exist_ok=True)

        def verify(path):
            if not path.is_file() or path.stat().st_size != size:
                return False
            with path.open("rb") as f:
                return hashlib.file_digest(f, "sha256").hexdigest() == sha

        if not verify(final):
            part = final.with_suffix(".part")
            try:
                subprocess.run(["curl", "-fLsS", "--retry", "2", "--connect-timeout", "20",
                                "--max-time", "240", "-o", str(part),
                                f"{REPO}{REV}/{name}?download=true"], check=True)
                if not verify(part):
                    raise RuntimeError(f"Hash or size mismatch: {name}")
                part.replace(final)
            finally:
                part.unlink(missing_ok=True)
        print(f"SHA256 OK {name}", flush=True)
        return name

    with ThreadPoolExecutor(max_workers=3) as pool:
        names = list(pool.map(download, FILES.items()))
    volume.commit()
    return names


@app.local_entrypoint()
def main():
    print("STAGE PASS:", stage.spawn().get(timeout=650), flush=True)
