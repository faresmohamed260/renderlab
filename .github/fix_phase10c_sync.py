from pathlib import Path

path = Path('.github/phase10c_contract_sync.py')
text = path.read_text()
old = '''if old not in text:
    raise SystemExit("frontend 10C paragraph not found")
frontend.write_text(text.replace(old, new))
'''
new = '''if old in text:
    text = text.replace(old, new)
else:
    start = text.index("Generation admission becomes part of the shared `submitGeneration` server boundary.")
    end = text.index("\\n\\nPlanned server-owned records", start)
    text = text[:start] + new.rstrip("\\n") + text[end:]
frontend.write_text(text)
'''
if old not in text:
    raise SystemExit('sync-script frontend guard not found')
path.write_text(text.replace(old, new))
