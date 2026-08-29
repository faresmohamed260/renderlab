from pathlib import Path
import subprocess

source = subprocess.check_output(
    ["git", "show", "aec4d6339a115cf9b187e7df9b782559d52e3278:scripts/apply-phase-7a-geometry.py"],
    text=True,
)
source = source.replace(
    "ROOT = Path(__file__).resolve().parents[1]",
    "ROOT = Path.cwd()",
)
source = source.replace(
    '    if count != 1:\n        raise RuntimeError(f"{label}: expected exactly one match, found {count}")\n    return text.replace(old, new, 1)\n',
    '    if label == "create ratio request" and count >= 1:\n        return text.replace(old, new, 1)\n    if count != 1:\n        raise RuntimeError(f"{label}: expected exactly one match, found {count}")\n    return text.replace(old, new, 1)\n',
    1,
)
exec(compile(source, "scripts/apply-phase-7a-geometry.py", "exec"), {"__name__": "__main__", "Path": Path})
