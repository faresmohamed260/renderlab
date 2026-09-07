from pathlib import Path

path = Path("docs/architecture/INFRASTRUCTURE.md")
text = path.read_text()
marker = "Qwen is audited but not the default user-facing image workflow.\n"
addition = """

### REDGraft availability drift — 2026-09-07
A fresh read-only gateway audit was required after Cycle 4 Phase 20 exact-head Video Generation Integration repeatedly failed before product-specific UI behavior with `generation_submission_failed: No configured generation worker is currently available.` Audit run `34117911334` probed both REDGraft registrations directly without submitting a generation or mutating either worker:

- registered primary `https://dreadcipher67--saga-ltx25-gateway-web.modal.run` returned HTTP `404` for `/health` and `/` with `modal-http: workspace ... is disabled`;
- registered standby `https://blackzerox67--saga-ltx25-gateway-web.modal.run` returned the same HTTP `404` disabled-workspace response for `/health` and `/`.

`src/server/generation/worker-fleet.ts` intentionally already excludes the old REDGraft primary from new routing, but still marks the standby `ltx-standby-01` active. That routing declaration is therefore stale relative to live Modal state as of this audit. The Phase 20 visual work did not cause or repair this infrastructure condition. Do not claim live Video/Animate acceptance or repeatedly rerun the live provider gate until a healthy already-approved REDGraft registration is verified or a worker recovery/redeployment is separately authorized and completed.

This note is evidence only. It does not disable routes, change routing metadata, redeploy/restart a worker, create a replacement worker, alter provider credentials, change Vercel/Supabase/R2 state, or authorize any such mutation. Production application state remains separately governed by the last explicit deployment record.
"""
if marker not in text:
    raise SystemExit("worker fleet marker not found")
if "### REDGraft availability drift — 2026-09-07" in text:
    raise SystemExit("outage note already present")
path.write_text(text.replace(marker, marker + addition, 1))
