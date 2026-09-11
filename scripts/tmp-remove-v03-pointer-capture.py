from pathlib import Path
p = Path('design/prototypes/create-lab-matrix-v03/prototype.js')
text = p.read_text()
for old in [
    "    if (node?.hasPointerCapture?.(pointerId)) node.releasePointerCapture(pointerId);\n",
    "      node.setPointerCapture?.(event.pointerId);\n",
]:
    if old not in text:
        raise SystemExit(f'expected pointer capture line not found: {old!r}')
    text = text.replace(old, '', 1)
p.write_text(text.rstrip() + '\n')
