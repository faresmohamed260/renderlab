from pathlib import Path

root = Path(__import__('sys').argv[1])

migration = root / 'docs/ui/UI_MIGRATION.md'
text = migration.read_text()
old = '- [ ] Remove the transitional Studio compatibility adapter after migration/debugging dependence is gone.'
new = '- [x] Remove the transitional Studio compatibility adapter after verifying current product generation no longer depends on it; PR #33 deletes `src/server/generation/studio-compat.ts` and keeps generation routed only through the authenticated external RenderLab backend or RenderLab-native orchestration.'
assert text.count(old) == 1, 'UI_MIGRATION adapter checkbox anchor changed'
migration.write_text(text.replace(old, new))

infra = root / 'docs/architecture/INFRASTRUCTURE.md'
text = infra.read_text()
old = '- `RENDERLAB_STUDIO_COMPAT_URL` — transitional migration/debugging compatibility only; not current product generation routing\n'
assert text.count(old) == 1, 'INFRASTRUCTURE optional Studio env anchor changed'
text = text.replace(old, '')
old = '## External Generation & Studio Compatibility Boundary\n'
new = '## External Generation Boundary\n'
assert text.count(old) == 1, 'INFRASTRUCTURE external boundary heading changed'
text = text.replace(old, new)
old = '`src/server/generation/studio-compat.ts` remains transitional migration/debugging code only. It is **not part of current product generation routing** and must not become a deployed Studio runtime dependency. Remove the adapter when no migration/debugging workflow requires it.\n'
new = 'The transitional Studio compatibility adapter has been removed after repository audit confirmed it was not part of current product generation routing. RenderLab no longer recognizes a Studio compatibility runtime URL; generation stays on the authenticated external RenderLab backend or RenderLab-native orchestration described above.\n'
assert text.count(old) == 1, 'INFRASTRUCTURE Studio adapter paragraph changed'
text = text.replace(old, new)
old = '5. Remove transitional Studio compatibility when no migration/debugging need remains.\n6. Keep Library/Activity against RenderLab-owned `media_assets`/`generation_jobs`, never legacy `studio_*`.\n7. Preserve conservative duplicate-avoidance if worker routing evolves.'
new = '5. Keep Library/Activity against RenderLab-owned `media_assets`/`generation_jobs`, never legacy `studio_*`.\n6. Preserve conservative duplicate-avoidance if worker routing evolves.'
assert text.count(old) == 1, 'INFRASTRUCTURE next-work Studio item changed'
infra.write_text(text.replace(old, new))
