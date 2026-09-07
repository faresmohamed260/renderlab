from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one target, found {count}")
    file_path.write_text(text.replace(old, new, 1))


replace_once(
    "src/features/create/create-advanced-panel.tsx",
    '<CollapsibleContent className="mt-3 rounded-xl border border-border bg-surface-2 p-4">',
    '<CollapsibleContent className="kinetic-precision-deck mt-3 overflow-hidden rounded-2xl border p-4 sm:p-5">',
)

replace_once(
    "src/features/create/create-workspace.tsx",
    '''        {statusText ? (\n          <Alert className="mt-4" role="status">\n            <AlertDescription>{statusText}</AlertDescription>\n          </Alert>\n        ) : null}''',
    '''        {statusText ? (\n          <Alert\n            className="kinetic-lifecycle relative mt-4 overflow-hidden"\n            role="status"\n            data-create-lifecycle-state={job?.status}\n            data-active={jobActive ? "true" : "false"}\n          >\n            <AlertDescription className="relative z-10 flex items-center gap-3">\n              <span aria-hidden="true" className="kinetic-lifecycle-orb shrink-0" />\n              <span>{statusText}</span>\n            </AlertDescription>\n          </Alert>\n        ) : null}''',
)

replace_once(
    "scripts/verify-create-lifecycle.mjs",
    '''  jobId = submissionPayload.job.id;\n  await writeFile(fixturePath, JSON.stringify({ jobId }), "utf8");''',
    '''  jobId = submissionPayload.job.id;\n  const activeLifecycle = page.locator("[data-create-lifecycle-state]");\n  await activeLifecycle.waitFor({ state: "visible", timeout: 10_000 });\n  const activeLifecycleState = await activeLifecycle.getAttribute("data-create-lifecycle-state");\n  assert(\n    ["queued", "preparing", "running", "persisting"].includes(activeLifecycleState),\n    `Create did not expose a truthful active lifecycle state after acceptance: ${activeLifecycleState}`,\n  );\n  assert((await generate.getAttribute("data-active")) === "true", "Generate actuator did not expose its active-generation treatment.");\n  await page.evaluate(() => window.scrollTo(0, 0));\n  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-active-generation.png`, fullPage: true });\n\n  await writeFile(fixturePath, JSON.stringify({ jobId }), "utf8");''',
)

css_path = Path("src/app/globals.css")
css_text = css_path.read_text()
result_marker = ".kinetic-result {"
if css_text.count(result_marker) != 1:
    raise SystemExit("globals.css: kinetic-result marker not unique")

precision_css = '''.kinetic-precision-deck {
  border-color: rgb(255 255 255 / 8%);
  background:
    linear-gradient(135deg, rgb(129 114 246 / 8%), transparent 34%, rgb(115 215 255 / 4%) 78%, transparent),
    linear-gradient(180deg, rgb(255 255 255 / 3.5%), transparent 24%),
    rgb(18 21 29 / 78%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 7%),
    inset 0 -1px 0 rgb(129 114 246 / 5%),
    0 18px 48px rgb(0 0 0 / 18%);
  backdrop-filter: blur(20px) saturate(128%);
  -webkit-backdrop-filter: blur(20px) saturate(128%);
  transform-origin: top center;
}

.kinetic-precision-deck[data-state="open"] {
  animation: kinetic-precision-reveal 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.kinetic-lifecycle {
  border-color: rgb(178 167 255 / 14%);
  background:
    linear-gradient(100deg, rgb(129 114 246 / 9%), transparent 36%, rgb(115 215 255 / 4%)),
    rgb(10 12 18 / 72%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 5%), 0 14px 38px rgb(0 0 0 / 16%);
  backdrop-filter: blur(18px) saturate(126%);
  -webkit-backdrop-filter: blur(18px) saturate(126%);
}

.kinetic-lifecycle[data-active="true"]::after {
  position: absolute;
  inset-block: 0;
  left: -34%;
  width: 28%;
  transform: skewX(-20deg);
  background: linear-gradient(90deg, transparent, rgb(178 167 255 / 12%), rgb(115 215 255 / 10%), transparent);
  animation: kinetic-lifecycle-scan 2.25s ease-in-out infinite;
  content: "";
  pointer-events: none;
}

.kinetic-lifecycle-orb {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--color-accent-bright);
  box-shadow: 0 0 0 4px rgb(129 114 246 / 8%), 0 0 18px rgb(129 114 246 / 46%);
}

.kinetic-lifecycle[data-create-lifecycle-state="succeeded"] .kinetic-lifecycle-orb {
  background: var(--color-success);
  box-shadow: 0 0 0 4px rgb(63 191 138 / 8%), 0 0 16px rgb(63 191 138 / 28%);
}

.kinetic-lifecycle[data-create-lifecycle-state="failed"] .kinetic-lifecycle-orb {
  background: var(--color-danger);
  box-shadow: 0 0 0 4px rgb(224 100 100 / 8%), 0 0 16px rgb(224 100 100 / 26%);
}

.kinetic-lifecycle[data-create-lifecycle-state="cancelled"] .kinetic-lifecycle-orb {
  background: var(--color-text-muted);
  box-shadow: 0 0 0 4px rgb(156 163 175 / 7%);
}

'''
css_text = css_text.replace(result_marker, precision_css + result_marker, 1)

keyframe_marker = "@keyframes kinetic-generate-scan {"
if css_text.count(keyframe_marker) != 1:
    raise SystemExit("globals.css: kinetic-generate-scan marker not unique")

precision_keyframes = '''@keyframes kinetic-precision-reveal {
  from {
    opacity: 0;
    transform: translateY(-6px) scaleY(0.985);
    filter: blur(3px);
  }

  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}

@keyframes kinetic-lifecycle-scan {
  0%, 16% { left: -34%; opacity: 0; }
  42% { opacity: 1; }
  78%, 100% { left: 112%; opacity: 0; }
}

'''
css_text = css_text.replace(keyframe_marker, precision_keyframes + keyframe_marker, 1)

reduced_marker = '''  .kinetic-generate[data-active="true"]::before {
    animation: none;
    left: 30%;
    opacity: 0.14;
  }'''
if css_text.count(reduced_marker) != 1:
    raise SystemExit("globals.css: reduced-motion marker not unique")

reduced_replacement = '''  .kinetic-generate[data-active="true"]::before {
    animation: none;
    left: 30%;
    opacity: 0.14;
  }

  .kinetic-precision-deck[data-state="open"],
  .kinetic-lifecycle[data-active="true"]::after {
    animation: none;
  }

  .kinetic-precision-deck[data-state="open"] {
    transform: none;
    filter: none;
  }

  .kinetic-lifecycle[data-active="true"]::after {
    left: 34%;
    opacity: 0.1;
  }'''
css_path.write_text(css_text.replace(reduced_marker, reduced_replacement, 1))
