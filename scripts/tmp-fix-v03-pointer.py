from pathlib import Path

prototype = Path('design/prototypes/create-lab-matrix-v03/prototype.js')
text = prototype.read_text()
old = """  referenceObjects.forEach((node) => {\n    node.addEventListener('dragstart', (event) => event.preventDefault());\n    node.addEventListener('pointerdown', (event) => {\n      if (event.pointerType === 'touch' || event.button !== 0 || state.mode !== 'image' || state.refs.length < 2) return;\n      const handle = event.target.closest?.('[data-reference-drag-handle]');\n      if (!node.dataset.alias || !handle || handle.closest('[data-reference-object]') !== node) return;\n      state.draggedAlias = node.dataset.alias;\n      state.dragPointerId = event.pointerId;\n      state.dragStartX = event.clientX;\n      state.dragStartY = event.clientY;\n      state.dragTargetAlias = null;\n      state.dragMoved = false;\n      node.setPointerCapture?.(event.pointerId);\n      node.classList.add('dragging');\n      setStatus('REFERENCE HOLD');\n      event.preventDefault();\n    });\n"""
new = """  referenceObjects.forEach((node) => {\n    node.addEventListener('dragstart', (event) => event.preventDefault());\n    const dragHandle = node.querySelector('[data-reference-drag-handle]');\n    dragHandle.addEventListener('pointerdown', (event) => {\n      if (event.pointerType === 'touch' || event.button !== 0 || state.mode !== 'image' || state.refs.length < 2) return;\n      if (!node.dataset.alias) return;\n      state.draggedAlias = node.dataset.alias;\n      state.dragPointerId = event.pointerId;\n      state.dragStartX = event.clientX;\n      state.dragStartY = event.clientY;\n      state.dragTargetAlias = null;\n      state.dragMoved = false;\n      node.setPointerCapture?.(event.pointerId);\n      node.classList.add('dragging');\n      setStatus('REFERENCE HOLD');\n      event.preventDefault();\n    });\n"""
if old not in text:
    raise SystemExit('prototype pointerdown block not found')
prototype.write_text(text.replace(old, new, 1).rstrip() + '\n')

verify = Path('scripts/verify-create-lab-matrix-v03.mjs')
text = verify.read_text()
old = """  const sourceBox = await handle.boundingBox();\n  const targetBox = await target.boundingBox();\n  if (!sourceBox || !targetBox) throw new Error(\"pointer reference geometry missing\");\n\n  const startX = sourceBox.x + sourceBox.width * .5;\n  const startY = sourceBox.y + sourceBox.height * .52;\n  const endX = targetBox.x + targetBox.width * .36;\n  const endY = targetBox.y + targetBox.height * .6;\n  await page.mouse.move(startX, startY);\n  await page.mouse.down();\n"""
new = """  const targetBox = await target.boundingBox();\n  if (!targetBox) throw new Error(\"pointer reference geometry missing\");\n\n  const endX = targetBox.x + targetBox.width * .36;\n  const endY = targetBox.y + targetBox.height * .6;\n  await handle.hover();\n  await page.mouse.down();\n"""
if old not in text:
    raise SystemExit('verifier pointer start block not found')
verify.write_text(text.replace(old, new, 1).rstrip() + '\n')
