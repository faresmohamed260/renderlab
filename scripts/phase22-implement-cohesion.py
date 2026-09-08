from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def replace_count(path: str, old: str, new: str, expected: int) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} matches, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new))


# Activity: presentation only; server ordering, pagination, refresh and action eligibility stay untouched.
replace_once(
    "src/features/activity/activity-view.tsx",
    '<section className="mx-auto w-full max-w-[1000px] px-4 pb-28 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:px-10 lg:pt-16">',
    '<section className="kinetic-activity-workspace mx-auto w-full max-w-[1000px] px-4 pb-28 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:px-10 lg:pt-16">',
)
replace_once(
    "src/features/activity/activity-view.tsx",
    '<p className="mt-8 flex items-center gap-2 text-sm text-text-muted" role="status">',
    '<p className="kinetic-activity-live mt-8 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-text-muted" role="status">',
)
replace_once(
    "src/features/activity/activity-view.tsx",
    '<li key={item.id} className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">',
    '''<li
                key={item.id}
                data-activity-status={item.status}
                data-active={isActiveGenerationStatus(item.status) ? "true" : "false"}
                className="kinetic-activity-row relative overflow-hidden rounded-2xl border p-4 sm:p-5"
              >''',
)
replace_once(
    "src/features/activity/activity-view.tsx",
    '<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(item)}`}>',
    '<span className={`kinetic-activity-status inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(item)}`}>',
)

# Settings: visual hierarchy only; all auth/access/admin logic remains exactly where it is.
replace_once(
    "src/features/account/account-settings.tsx",
    '<div className="rounded-xl border border-border bg-surface-1 p-5 sm:p-6">',
    '<div className="kinetic-settings-panel rounded-2xl border border-border p-5 sm:p-6">',
)
replace_once(
    "src/features/account/account-settings.tsx",
    '<div className="mt-5 rounded-lg border border-border bg-surface-2 p-4">',
    '<div className="kinetic-settings-access mt-5 rounded-xl border border-border bg-surface-2 p-4">',
)
replace_once(
    "src/features/account/account-settings.tsx",
    '''          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="secondary">''',
    '''          <div className="mt-5 border-t border-border/70 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Security</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">Manage your password or end this signed-in session.</p>
            <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="secondary">''',
)
replace_once(
    "src/features/account/account-settings.tsx",
    '''            <Button variant="secondary" onClick={handleSignOut} disabled={busyAction !== null}>
              {busyAction === "signout" ? <Spinner aria-hidden="true" /> : null}
              Sign out
            </Button>
          </div>
        </div>''',
    '''            <Button variant="secondary" onClick={handleSignOut} disabled={busyAction !== null}>
              {busyAction === "signout" ? <Spinner aria-hidden="true" /> : null}
              Sign out
            </Button>
            </div>
          </div>
        </div>''',
)
replace_once(
    "src/features/account/account-settings.tsx",
    '<form className="flex max-w-lg flex-col gap-5" onSubmit={handleSignIn}>',
    '''<form className="kinetic-settings-panel flex max-w-lg flex-col gap-5 rounded-2xl border border-border p-5 sm:p-6" onSubmit={handleSignIn}>
      <div>
        <p className="text-sm font-semibold text-text">Sign in</p>
        <p className="mt-1 text-sm leading-6 text-text-muted">Use the credentials for your invited RenderLab account.</p>
      </div>''',
)

replace_once(
    "src/app/(app)/settings/page.tsx",
    '<section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">',
    '<section className="kinetic-settings-workspace mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">',
)
replace_once(
    "src/app/(app)/settings/page.tsx",
    '<div className="mb-7">',
    '<div className="kinetic-settings-intro mb-8">',
)
replace_once(
    "src/app/(app)/settings/page.tsx",
    '<div className="rounded-xl border border-border bg-surface-1 p-5 sm:p-6">',
    '<div className="kinetic-settings-panel rounded-2xl border border-border p-5 sm:p-6">',
)
replace_once(
    "src/app/(app)/settings/page.tsx",
    '<section className="grid gap-3 border-t border-border py-6 sm:grid-cols-[13rem_1fr] sm:gap-8">',
    '<section className="grid gap-4 border-t border-border/80 py-7 sm:grid-cols-[13rem_1fr] sm:gap-8">',
)
replace_once(
    "src/app/(app)/settings/password/page.tsx",
    '<section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">',
    '<section className="kinetic-settings-workspace mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">',
)
replace_once(
    "src/app/(app)/settings/password/page.tsx",
    '<div className="mb-6 flex flex-col gap-2">',
    '<div className="kinetic-settings-intro mb-7 flex flex-col gap-2">',
)
replace_once(
    "src/features/account/account-password-form.tsx",
    '<div className="rounded-xl border border-border bg-surface-1 p-5 sm:p-6">',
    '<div className="kinetic-settings-panel rounded-2xl border border-border p-5 sm:p-6">',
)

# Landing: approved Kinetic Precision copy/composition, still static and closed-beta truthful.
replace_once(
    "src/app/page.tsx",
    '<main className="min-h-dvh overflow-x-hidden bg-canvas text-text">',
    '<main className="kinetic-landing min-h-dvh overflow-x-hidden bg-canvas text-text">',
)
replace_once(
    "src/app/page.tsx",
    '<header className="flex min-h-14 items-center rounded-2xl border border-border bg-[#0d0f13]/95 px-4 sm:px-6">',
    '<header className="kinetic-glass kinetic-landing-header flex min-h-14 items-center rounded-2xl border border-border px-4 sm:px-6">',
)
replace_once(
    "src/app/page.tsx",
    '<section className="grid gap-12 pb-20 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(500px,0.92fr)] lg:items-center lg:gap-16 lg:pb-28 lg:pt-20">\n          <div>',
    '<section className="grid gap-12 pb-20 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(500px,0.92fr)] lg:items-center lg:gap-16 lg:pb-28 lg:pt-20">\n          <div className="kinetic-landing-copy">',
)
replace_once(
    "src/app/page.tsx",
    '''            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">The creative workspace</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-text sm:text-6xl lg:text-[4.2rem] lg:leading-[1.03]">
              Create images. Shape them. Put them in motion.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-text-muted sm:text-lg">
              RenderLab brings image and video creation, reference-driven edits, reusable media, and retryable generation history into one focused workspace.
            </p>''',
    '''            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-text">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-bright shadow-[0_0_12px_var(--accent-glow)]" />
              Closed beta · invitation only
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">The creative workspace</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-text sm:text-6xl lg:text-[4.2rem] lg:leading-[1.03]">
              <span className="block">Create with intent.</span>
              <span className="mt-1 block">Keep what matters.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-text-muted sm:text-lg">
              Image and video creation with durable media, reusable references, truthful generation state, and a focused continuation loop.
            </p>''',
)
replace_count(
    "src/app/page.tsx",
    'className="rounded-2xl border border-border bg-surface-1 p-5 sm:p-6"',
    'className="kinetic-landing-card rounded-2xl border border-border p-5 sm:p-6"',
    1,
)
replace_count(
    "src/app/page.tsx",
    'className="rounded-2xl border border-border bg-surface-1 p-6 sm:p-8"',
    'className="kinetic-landing-card rounded-2xl border border-border p-6 sm:p-8"',
    2,
)
replace_once(
    "src/app/page.tsx",
    '<div className="flex flex-col gap-7 rounded-3xl border border-border bg-surface-1 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">',
    '<div className="kinetic-glass-strong flex flex-col gap-7 rounded-3xl border border-border p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">',
)
replace_once(
    "src/app/page.tsx",
    '<div aria-label="RenderLab Create workspace preview" className="rounded-3xl border border-border bg-surface-1 p-4 shadow-2xl shadow-black/20 sm:p-5">',
    '''<div
      aria-label="RenderLab Create workspace product preview"
      data-preview-static="true"
      className="kinetic-glass-strong kinetic-landing-preview rounded-3xl border border-border p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Product preview</p>
        <span className="rounded-full border border-border bg-surface-2/80 px-2.5 py-1 text-[10px] font-semibold text-text-muted">Static illustration</span>
      </div>''',
)
replace_once(
    "src/app/page.tsx",
    '<p className="text-[11px] font-semibold text-text">Result saved to Library</p>',
    '<p className="text-[11px] font-semibold text-text">Durable result</p>',
)
replace_once(
    "src/app/page.tsx",
    '''      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["Create Image", "Edit Image", "Create Video", "Animate Image"].map((label) => (
          <span key={label} className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-center text-[10px] font-semibold text-text-muted">
            {label}
          </span>
        ))}
      </div>
    </div>''',
    '''      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["Create Image", "Edit Image", "Create Video", "Animate Image"].map((label) => (
          <span key={label} className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-center text-[10px] font-semibold text-text-muted">
            {label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-medium text-text-muted">Static product illustration — not live generation state.</p>
    </div>''',
)

# Kinetic Phase 22 styles: additive, surface-scoped and reduced-motion safe.
css_path = Path("src/app/globals.css")
css = css_path.read_text()
css_marker = "\n@media (hover: hover) and (pointer: fine) {\n"
if css.count(css_marker) != 1:
    raise SystemExit("globals.css: hover media marker mismatch")
phase22_css = r'''

.kinetic-activity-workspace,
.kinetic-settings-workspace {
  position: relative;
  isolation: isolate;
}

.kinetic-activity-workspace::before,
.kinetic-settings-workspace::before {
  position: absolute;
  inset: 1.5rem 6% auto;
  z-index: -1;
  height: 18rem;
  border-radius: 999px;
  background:
    radial-gradient(circle at 20% 12%, rgb(129 114 246 / 10%), transparent 40%),
    radial-gradient(circle at 84% 8%, rgb(115 215 255 / 5%), transparent 34%);
  filter: blur(34px);
  content: "";
  pointer-events: none;
}

.kinetic-activity-live,
.kinetic-settings-panel,
.kinetic-settings-access,
.kinetic-landing-card {
  border-color: rgb(255 255 255 / 8%);
  background:
    linear-gradient(180deg, rgb(255 255 255 / 3.2%), transparent 28%),
    linear-gradient(118deg, rgb(129 114 246 / 4.5%), transparent 44%, rgb(115 215 255 / 2.4%)),
    rgb(10 12 18 / 74%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 6%),
    0 18px 48px rgb(0 0 0 / 18%);
  backdrop-filter: blur(20px) saturate(126%);
  -webkit-backdrop-filter: blur(20px) saturate(126%);
}

.kinetic-activity-live {
  border-color: rgb(178 167 255 / 16%);
  background:
    linear-gradient(100deg, rgb(129 114 246 / 8%), transparent 42%, rgb(115 215 255 / 3%)),
    rgb(10 12 18 / 70%);
}

.kinetic-activity-row {
  isolation: isolate;
  border-color: rgb(255 255 255 / 8%);
  background:
    linear-gradient(180deg, rgb(255 255 255 / 3%), transparent 30%),
    rgb(10 12 18 / 76%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 5%), 0 14px 38px rgb(0 0 0 / 16%);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.kinetic-activity-row::before {
  position: absolute;
  inset-block: 1rem;
  left: 0;
  z-index: -1;
  width: 2px;
  border-radius: 999px;
  background: rgb(156 163 175 / 42%);
  box-shadow: 0 0 14px rgb(156 163 175 / 12%);
  content: "";
}

.kinetic-activity-row[data-active="true"] {
  border-color: rgb(178 167 255 / 20%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 7%),
    0 18px 48px rgb(0 0 0 / 20%),
    0 0 30px rgb(129 114 246 / 8%);
}

.kinetic-activity-row[data-active="true"]::before {
  background: linear-gradient(to bottom, var(--color-accent-bright), var(--color-electric));
  box-shadow: 0 0 18px rgb(129 114 246 / 34%);
}

.kinetic-activity-row[data-active="true"]::after {
  position: absolute;
  inset-block: 0;
  left: -34%;
  z-index: -1;
  width: 26%;
  transform: skewX(-20deg);
  background: linear-gradient(90deg, transparent, rgb(178 167 255 / 8%), rgb(115 215 255 / 6%), transparent);
  animation: kinetic-lifecycle-scan 2.5s ease-in-out infinite;
  content: "";
  pointer-events: none;
}

.kinetic-activity-row[data-activity-status="succeeded"]::before {
  background: var(--color-success);
  box-shadow: 0 0 14px rgb(63 191 138 / 20%);
}

.kinetic-activity-row[data-activity-status="failed"]::before {
  background: var(--color-danger);
  box-shadow: 0 0 14px rgb(224 100 100 / 18%);
}

.kinetic-activity-row[data-activity-status="cancelled"]::before {
  background: var(--color-text-muted);
  box-shadow: none;
}

.kinetic-activity-status {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.kinetic-settings-intro {
  position: relative;
  padding-bottom: 0.25rem;
}

.kinetic-settings-intro::after {
  position: absolute;
  right: 0;
  bottom: -0.5rem;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, rgb(178 167 255 / 22%), rgb(115 215 255 / 8%) 44%, transparent 78%);
  content: "";
  pointer-events: none;
}

.kinetic-settings-panel {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 7%),
    0 20px 58px rgb(0 0 0 / 20%);
}

.kinetic-settings-access {
  background:
    linear-gradient(110deg, rgb(129 114 246 / 7%), transparent 42%, rgb(115 215 255 / 3%)),
    rgb(18 21 29 / 72%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 5%);
}

.kinetic-landing {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(ellipse 78% 42% at 48% -8%, rgb(129 114 246 / 22%), transparent 68%),
    radial-gradient(ellipse 42% 34% at 91% 28%, rgb(115 215 255 / 8%), transparent 72%),
    linear-gradient(180deg, #080910 0%, var(--color-canvas) 48%, #07080d 100%);
}

.kinetic-landing::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(rgb(255 255 255 / 2.5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 2.5%) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(ellipse 78% 60% at 50% 18%, black, transparent 82%);
  opacity: 0.42;
  content: "";
  pointer-events: none;
}

.kinetic-landing-header {
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 7%), 0 18px 54px rgb(0 0 0 / 18%);
}

.kinetic-landing-copy,
.kinetic-landing-preview {
  animation: kinetic-landing-enter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.kinetic-landing-preview {
  animation-delay: 70ms;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 10%),
    0 30px 90px rgb(0 0 0 / 34%),
    0 0 48px rgb(129 114 246 / 10%);
}

.kinetic-landing-card {
  transition: border-color 180ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease;
}

@keyframes kinetic-landing-enter {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.992);
    filter: blur(3px);
  }

  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
'''
css_path.write_text(css.replace(css_marker, phase22_css + css_marker, 1))

# Reduced-motion/static equivalents for every Phase 22 animation.
replace_once(
    "src/app/globals.css",
    '''  .kinetic-selection-deck {
    animation: none;
  }
}''',
    '''  .kinetic-selection-deck {
    animation: none;
  }

  .kinetic-activity-row,
  .kinetic-landing-card {
    transition: none;
  }

  .kinetic-activity-row[data-active="true"]::after {
    animation: none;
    left: 34%;
    opacity: 0.08;
  }

  .kinetic-landing-copy,
  .kinetic-landing-preview {
    animation: none;
    transform: none;
    filter: none;
  }
}''',
)

# Launch verifier keeps every existing route/focus/metadata/forbidden-claim assertion and adopts the approved heading.
replace_count(
    "scripts/verify-brand-launch.mjs",
    'getByRole("heading", { name: "Create images. Shape them. Put them in motion." })',
    'getByRole("heading", { name: "Create with intent. Keep what matters." })',
    2,
)
replace_once(
    "scripts/verify-brand-launch.mjs",
    '  await desktop.getByText("Invitation-only access · No public sign-up").waitFor();',
    '''  await desktop.getByText("Invitation-only access · No public sign-up").waitFor();
  await desktop.getByText("Static product illustration — not live generation state.", { exact: true }).waitFor();
  assert(await desktop.locator('[data-preview-static="true"]').count() === 1, "Landing product preview is not explicitly marked static.");''',
)

# Future-only global Phase 22 CSS changes must still retrigger the surface lifecycle verifiers that consume these classes.
replace_once(
    ".github/workflows/activity-visual.yml",
    '      - "package.json"\n      - "src/components/ui/**"',
    '      - "package.json"\n      - "src/app/globals.css"\n      - "src/components/ui/**"',
)
replace_count(
    ".github/workflows/activity-cancel-visual.yml",
    '      - "src/components/ui/**"',
    '      - "src/app/globals.css"\n      - "src/components/ui/**"',
    2,
)
replace_once(
    ".github/workflows/account-identity-visual.yml",
    '      - "src/features/account/**"',
    '      - "src/app/globals.css"\n      - "src/features/account/**"',
)

# Record draft implementation state without claiming acceptance or completion.
replace_once(
    "PROJECT.md",
    '**Status: `DESIGN CHECKPOINT APPROVED / IMPLEMENTATION READY / IMPLEMENTATION NOT STARTED`.**',
    '**Status: `IMPLEMENTED IN DRAFT / EXACT-HEAD ACCEPTANCE IN PROGRESS`.**',
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    '- **Phase 22 — Activity, Settings, Landing & System Cohesion:** `DESIGN CHECKPOINT APPROVED / IMPLEMENTATION READY / IMPLEMENTATION NOT STARTED` — contract baseline `c17abfef07fbc580c51f458496e4e53502816229`; reviewed checkpoint evidence `34265429235` / artifact `10071612375`.',
    '- **Phase 22 — Activity, Settings, Landing & System Cohesion:** `IMPLEMENTED IN DRAFT / EXACT-HEAD ACCEPTANCE IN PROGRESS` — contract baseline `c17abfef07fbc580c51f458496e4e53502816229`; reviewed checkpoint evidence `34265429235` / artifact `10071612375`.',
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    '**Status: `DESIGN CHECKPOINT APPROVED / IMPLEMENTATION READY / IMPLEMENTATION NOT STARTED`.** Planning baseline `c17abfef07fbc580c51f458496e4e53502816229`; checkpoint review run `34265429235`, artifact `10071612375` (`sha256:0508d5df26e4304e21239a02c2618d93cef924f5a18aa1ba7180bb13eb3422ab`).',
    '**Status: `IMPLEMENTED IN DRAFT / EXACT-HEAD ACCEPTANCE IN PROGRESS`.** Planning baseline `c17abfef07fbc580c51f458496e4e53502816229`; checkpoint review run `34265429235`, artifact `10071612375` (`sha256:0508d5df26e4304e21239a02c2618d93cef924f5a18aa1ba7180bb13eb3422ab`).',
)

# Temporary staging files never survive the durable implementation commit.
Path("scripts/phase22-implement-cohesion.py").unlink()
workflow = Path(".github/workflows/phase22-implement-cohesion.yml")
if workflow.exists():
    workflow.unlink()
