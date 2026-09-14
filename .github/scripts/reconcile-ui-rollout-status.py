from pathlib import Path

path = Path("PROJECT.md")
text = path.read_text()
replacements = {
    "1. **Phase 25 — Media Viewer:** USER-APPROVED / EXACT-HEAD VERIFIED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED.":
    "1. **Phase 25 — Media Viewer:** USER-APPROVED / EXACT-HEAD VERIFIED / MERGED / MERGED-MAIN VERIFIED / PRODUCTION-LIVE.",
    "2. **Phase 26 — Activity:** USER-APPROVED / EXACT-HEAD VERIFIED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED.":
    "2. **Phase 26 — Activity:** USER-APPROVED / EXACT-HEAD VERIFIED / MERGED / MERGED-MAIN VERIFIED / PRODUCTION-LIVE.",
    "3. **Phase 27 — Settings / account-security flows:** IMPLEMENTED / EXACT-HEAD VERIFIED / FIDELITY REVIEWED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED.":
    "3. **Phase 27 — Settings / account-security flows:** IMPLEMENTED / EXACT-HEAD VERIFIED / FIDELITY REVIEWED / MERGED / MERGED-MAIN VERIFIED / PRODUCTION-LIVE.",
    "4. **Phase 28 — Admin:** USER-APPROVED / EXACT-HEAD VERIFIED / FIDELITY REVIEWED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED.":
    "4. **Phase 28 — Admin:** USER-APPROVED / EXACT-HEAD VERIFIED / FIDELITY REVIEWED / MERGED / MERGED-MAIN VERIFIED / PRODUCTION-LIVE.",
}
for old, new in replacements.items():
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one match, found {count}: {old}")
    text = text.replace(old, new, 1)
path.write_text(text)
print("PROJECT.md rollout statuses reconciled")
