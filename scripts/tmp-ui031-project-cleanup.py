from pathlib import Path
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')
path = root / 'PROJECT.md'
text = path.read_text()
old = '- UI-030 leaves the ownership prerequisite satisfied for the active Favorites v0.1 / UI-031 slice; Collections, Delete/batch and other organization/management follow-ups remain separate and unstarted.'
new = '- UI-030 provides the enforced ownership boundary used by approved Favorites v0.1 / UI-031; Collections, Delete/batch and other organization/management follow-ups remain separate and unstarted.'
if text.count(old) != 1:
    raise SystemExit(f'PROJECT.md: expected one stale UI-031 active-state sentence, found {text.count(old)}')
path.write_text(text.replace(old, new, 1))
print('Final PROJECT.md UI-031 active-state cleanup prepared.')
