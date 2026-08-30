from pathlib import Path
import re

MERGE = "c03e26c683c9c7c430c0e55cc306f5889f004844"
START = "d8fa1fc754c4e5bdc3648177fb7f833218dc1d95"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def regex_once(text, pattern, replacement, label, flags=0):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, got {count}")
    return updated


path = "PROJECT.md"
text = read(path)
text = regex_once(
    text,
    r"## Current Priority\n\*\*.*?\*\*\n\n### Cycle 2 objective",
    f"""## Current Priority
**Cycle 2 — Creative Productivity & Beta Maturity. Phases 6–11 are complete and verified. Phase 12 Cycle 2 Release Validation contract merged through PR #74 as `{MERGE}`. Phase 12A non-deploying Release Candidate Validation is now authorized by the repository contract but has not yet frozen/executed its candidate. Phase 12B production rollout remains separately authorization-gated. Current production remains the older READY deployment at application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`, so 12A must validate current `main` directly. No deployment is authorized.**

### Cycle 2 objective""",
    "PROJECT current priority",
    re.S,
)
text = regex_once(
    text,
    r"^- \*\*Phase 12 — Cycle 2 Release Validation:.*$",
    f"- **Phase 12 — Cycle 2 Release Validation: CONTRACT MERGED / 12A NOT STARTED.** PR #74 merged the execution contract as `{MERGE}`. 12A may now freeze one exact current-main release candidate and run the non-deploying validation/audit sequence. 12B remains blocked until explicit deployment/production-mutation authorization.",
    "PROJECT Phase 12 roadmap",
    re.M,
)
text = regex_once(
    text,
    r"(### Phase 12 execution contract — expanded 2026-08-30\n)\*\*Status:.*?\*\*",
    lambda m: m.group(1) + f"**Status: `CONTRACT MERGED / 12A NOT STARTED`. PR #74 merged this execution contract to `main` as `{MERGE}`. 12A validation work is authorized; 12B deployment/production mutation is not.**",
    "PROJECT Phase 12 status",
    re.S,
)
write(path, text)

path = "docs/ui/UI_MIGRATION.md"
text = read(path)
text = regex_once(
    text,
    r"(### Phase 12 — Cycle 2 Release Validation\n)\*\*Contract status:\*\*.*$",
    lambda m: m.group(1) + f"**Contract status:** `CONTRACT MERGED / 12A NOT STARTED`. PR #74 merged the execution-ready Phase 12 contract as `{MERGE}`. 12A is now authorized; 12B remains explicitly deployment-gated.",
    "UI_MIGRATION Phase 12 status",
    re.M,
)
current = f"""## Current Work
**Current cycle:** Cycle 2 — Creative Productivity & Beta Maturity is in progress; Phases 6–11 are complete/verified.
**Current phase contract:** Phase 12 — Cycle 2 Release Validation is `CONTRACT MERGED / 12A NOT STARTED`; PR #74 merged as `{MERGE}`.
**Next sequence:** freeze one exact current `main` SHA as the first 12A release candidate, run non-deploying static/build/full configured + integrated validation, perform read-only infrastructure/security audits and exact cleanup, then record a candidate manifest. Any code/config fix creates a new candidate and invalidates stale-head evidence.
**Release reality:** current READY production remains application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`; contract-start `main` `{START}` was 216 commits ahead with executable changes. Production health is baseline evidence only.
**Deployment boundary:** Phase 12B remains blocked without explicit user authorization. No Vercel deployment, production access-enforcement/bootstrap, Auth hosted-config or R2 mutation is authorized during 12A.
**Broader-beta boundary:** built-in mail/rate-limit posture, unverified production Auth Site URL/redirect/template/sender/custom-SMTP posture and Free-plan leaked-password protection remain open until separately evidenced.
**Post-Cycle-2 accepted direction:** LoRA/model-adapter library remains out of Phase 12.

## Session Handoff Rule"""
text = regex_once(text, r"## Current Work\n.*?## Session Handoff Rule", current, "UI_MIGRATION Current Work", re.S)
write(path, text)

path = "docs/architecture/INFRASTRUCTURE.md"
text = read(path)
marker = "### Phase 12 pre-release infrastructure audit — 2026-08-30\n"
if marker not in text:
    raise RuntimeError("Phase 12 infrastructure audit missing")
text = text.replace(marker, marker + f"Phase 12 execution contract PR #74 merged as `{MERGE}`. The following evidence remains the starting baseline for 12A; merge itself performed no deployment or production mutation.\n\n", 1)
write(path, text)
