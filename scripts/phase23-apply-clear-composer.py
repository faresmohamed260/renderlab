from pathlib import Path
import re
import textwrap

workspace_path = Path("src/features/create/create-workspace.tsx")
css_path = Path("src/app/globals.css")
verifier_path = Path("scripts/verify-create-lifecycle.mjs")
contract_path = Path("docs/ui/CREATE_CLEAR_COMPOSER_IMPLEMENTATION_CONTRACT.md")

source = workspace_path.read_text()


def replace_once(old, new, label):
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    source = source.replace(old, new, 1)


replace_once(
    '''const rotatingCreateHeadlines = [
  "What do you want to create?",
  "What do you want to explore?",
  "What do you want to transform?",
  "What do you want to imagine?",
] as const;
''',
    '',
    'rotating headline constant',
)
replace_once(
    '  const [createHeadlineIndex, setCreateHeadlineIndex] = useState(0);\n',
    '',
    'rotating headline state',
)
replace_once(
    '''  useEffect(() => {
    if (reduceMotion || hasReference || outputKind !== "image") {
      setCreateHeadlineIndex(0);
      return;
    }
    const intervalId = window.setInterval(() => {
      setCreateHeadlineIndex((current) => (current + 1) % rotatingCreateHeadlines.length);
    }, 4200);
    return () => window.clearInterval(intervalId);
  }, [hasReference, outputKind, reduceMotion]);

''',
    '',
    'rotating headline effect',
)
replace_once(
    '''  const heading = hasReference
    ? outputKind === "image"
      ? "Edit an image"
      : "Animate an image"
    : outputKind === "image"
      ? rotatingCreateHeadlines[createHeadlineIndex]
      : "Create a video";
  const supportingText = hasReference
    ? references.length > 1
      ? "Your references set the creative context. The first image controls the primary edit geometry."
      : "Your reference sets the creative context automatically."
    : outputKind === "image"
      ? "Start with an idea. Add a reference only when you need one."
      : "Only the essentials stay visible. More control is available when you ask for it.";
''',
    '''  const heading = outputKind === "image" ? "Create an image" : "Create a video";
  const supportingText = outputKind === "image"
    ? hasReference
      ? references.length > 1
        ? "Shape the result with a primary image and one supporting reference."
        : "Shape the result from your primary image, then describe the change you want."
      : "Describe what you want. Add references if you have them, then generate."
    : hasReference
      ? "Use the Start image as the first frame, then describe the motion or shot you want."
      : "Describe the motion or shot you want. Add a Start image only when it helps.";
''',
    'heading and support copy',
)
replace_once(
    '<section className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-5xl flex-col px-4 pb-24 pt-12 sm:px-8 sm:pt-20 lg:pb-12 lg:pt-36">',
    '<section className="clear-create-workspace mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-7xl flex-col px-4 pb-24 pt-10 sm:px-8 sm:pt-16 lg:pb-16 lg:pt-24">',
    'workspace shell',
)
replace_once(
    '<div className="mx-auto w-full max-w-3xl">',
    '<div className="clear-create-stack mx-auto w-full max-w-6xl">',
    'workspace stack',
)
replace_once(
    'className="mb-8 sm:mb-12"',
    'className="clear-create-context mb-8 sm:mb-10"',
    'context class',
)
replace_once(
    '''              <span>
                {outputKind === "image"
                  ? hasReference ? "Image edit" : "Image synthesis"
                  : hasReference ? "Image animation" : "Video synthesis"}
              </span>
''',
    '''              <span>{outputKind === "image" ? "Create / Image" : "Create / Video"}</span>
''',
    'context eyebrow',
)
heading_pattern = re.compile(
    r'''            <h2 className="min-h-\[4\.75rem\] text-\[30px\] font-semibold tracking-\[-0\.035em\] text-text sm:min-h-\[2\.75rem\] sm:text-\[34px\]">\n.*?            </h2>''',
    re.S,
)
source, count = heading_pattern.subn(
    '''            <h2 className="min-h-[3.25rem] text-[38px] font-semibold tracking-[-0.05em] text-text sm:text-[48px] lg:text-[56px]">
              {heading}
            </h2>''',
    source,
    count=1,
)
if count != 1:
    raise SystemExit(f"context heading: expected one match, found {count}")

replace_once(
    'className="kinetic-composer relative isolate overflow-hidden rounded-[24px] border p-3 sm:p-4"',
    'className="clear-create-composer kinetic-composer relative isolate overflow-hidden rounded-[22px] border p-3 sm:p-4"',
    'composer class',
)
replace_once(
    '          data-create-instrument="true"\n          data-create-mode={outputKind}',
    '          data-create-instrument="true"\n          data-create-layout="clear-composer"\n          data-create-mode={outputKind}',
    'composer data attribute',
)

mode_pattern = re.compile(
    r'''\n                <ToggleGroup\n                  type="single"\n                  value=\{outputKind\}\n                  aria-label="Output type".*?\n                </ToggleGroup>\n''',
    re.S,
)
match = mode_pattern.search(source)
if not match:
    raise SystemExit('mode switch block not found')
mode_block = textwrap.dedent(match.group(0).strip('\n'))
source = source[:match.start()] + '\n' + source[match.end():]

input_anchor = source.index('                <input\n                  ref={fileInputRef}')
add_start = source.index(
    '                <Button\n                  type="button"\n                  variant="secondary"\n                  size="xs"\n                  className="size-8 !px-0"\n                  disabled={',
    input_anchor,
)
aria_index = source.index('                  aria-label="Add reference"', add_start)
add_end = source.index('                </Button>', aria_index) + len('                </Button>')
source = source[:add_start] + source[add_end:]

mode_block = textwrap.indent(mode_block, '            ')
promoted_controls = f'''          <div className="clear-composer-mode" data-create-mode-switch="true">\n{mode_block}\n          </div>\n\n          <div className="clear-composer-reference-bar" data-create-reference-bar="true">\n            <Button\n              type="button"\n              variant="secondary"\n              size="sm"\n              className="clear-composer-reference-trigger"\n              disabled={{\n                !accountAvailable\n                || !mediaUploadAvailable\n                || referenceUploading\n                || (references.length >= maxReferences && !(outputKind === "video" && references.length === 1))\n              }}\n              onClick={{() => chooseReferenceFile(outputKind === "video" && references[0] ? references[0].alias : null)}}\n              aria-label={{outputKind === "video" ? (references.length ? "Replace Start image" : "Start image") : "Add reference"}}\n              title={{\n                !accountAvailable\n                  ? "Sign in to add a private reference image."\n                  : !mediaUploadAvailable\n                    ? "Reference upload storage is not configured in this environment."\n                    : outputKind === "video" && references.length\n                      ? "Replace the Start image"\n                      : references.length >= maxReferences\n                        ? "Image supports up to two references."\n                        : outputKind === "video"\n                          ? "Add an optional Start image"\n                          : "Add a reference image"\n              }}\n            >\n              {{referenceUploading ? <Spinner data-icon="inline-start" /> : <Plus aria-hidden="true" data-icon="inline-start" />}}\n              <span>{{outputKind === "video" ? (references.length ? "Replace Start image" : "Start image") : "Add reference"}}</span>\n            </Button>\n            <span className="clear-composer-reference-help">\n              {{outputKind === "image" ? "Optional · up to two images" : "Optional · one image"}}\n            </span>\n          </div>\n\n'''
replace_once(
    '          <Textarea\n',
    promoted_controls + '          <Textarea\n',
    'promoted composer controls insertion',
)
replace_once(
    'className="min-h-36 px-2 py-2 text-[17px] leading-7 placeholder:text-text-muted/55 sm:min-h-32 sm:text-[18px]"',
    'className="clear-composer-prompt min-h-36 px-2 py-2 text-[17px] leading-7 placeholder:text-text-muted/55 sm:min-h-32 sm:text-[18px]"',
    'prompt class',
)
replace_once(
    '<div className="mb-3 space-y-2" aria-label="Attached references">',
    '<div className="clear-composer-reference-list mb-3 space-y-2" data-create-reference-list="true" aria-label="Attached references">',
    'reference list class',
)
replace_once(
    '''                      {outputKind === "video"
                        ? "Animating this image"
                        : references.length === 1
                          ? "Editing this image"
                          : index === 0
                            ? "Primary image"
                            : "Reference image"}
''',
    '''                      {outputKind === "video"
                        ? "Start image"
                        : index === 0
                          ? "Primary image"
                          : "Reference image"}
''',
    'reference role copy',
)
replace_once(
    '<Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>',
    '<Collapsible className="clear-composer-controls" open={advancedOpen} onOpenChange={setAdvancedOpen}>',
    'collapsible class',
)
replace_once(
    'data-create-primary-controls className="flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 pb-1 sm:gap-2 sm:pb-0"',
    'data-create-primary-controls className="clear-composer-settings flex min-w-0 flex-1 flex-wrap items-center gap-2 pb-1 sm:pb-0"',
    'settings layout',
)
replace_once(
    '''                    title="Advanced generation controls"
                    className={`size-8 !px-0${advancedOpen ? " bg-surface-3" : ""}`}
                  >
                    <MoreHorizontal aria-hidden="true" />
''',
    '''                    title="Advanced generation controls"
                    className={`clear-composer-advanced-trigger min-h-10 gap-2 px-3${advancedOpen ? " bg-surface-3" : ""}`}
                  >
                    <span>Advanced</span>
                    <MoreHorizontal aria-hidden="true" className="size-4" />
''',
    'advanced trigger',
)
replace_once(
    '{statusText ? (',
    '{statusText && (jobActive || job?.status === "failed" || job?.status === "cancelled") ? (',
    'status visibility',
)
replace_once(
    'className="kinetic-lifecycle relative mt-4 overflow-hidden"',
    'className="clear-create-stage kinetic-lifecycle relative mt-6 overflow-hidden"',
    'lifecycle stage class',
)
replace_once(
    '''            <AlertDescription className="relative z-10 flex items-center gap-3">
              <span aria-hidden="true" className="kinetic-lifecycle-orb shrink-0" />
              <span>{statusText}</span>
            </AlertDescription>
''',
    '''            <AlertDescription className="clear-create-stage-content relative z-10 flex items-center gap-3">
              <span aria-hidden="true" className="kinetic-lifecycle-orb shrink-0" />
              <span className="clear-create-stage-copy">
                <span aria-hidden="true" className="clear-create-stage-kicker">RENDERLAB / GENERATION</span>
                <strong>{statusText}</strong>
                {jobActive ? <small>Your prompt, references, and settings stay attached below.</small> : null}
              </span>
            </AlertDescription>
''',
    'lifecycle stage content',
)
replace_once(
    'className="kinetic-result mt-8 flex min-h-64 items-center justify-center rounded-[20px] border text-sm text-text-muted"',
    'className="clear-create-result-loading kinetic-result mt-6 flex min-h-64 items-center justify-center rounded-[18px] border text-sm text-text-muted"',
    'result loading class',
)
replace_once(
    'className="kinetic-result mt-8 overflow-hidden rounded-[20px] border"',
    'className="clear-create-result kinetic-result mt-6 overflow-hidden border"\n              data-create-result-kind={resultAsset.kind}',
    'result article class',
)
replace_once(
    '<div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">',
    '<div className="clear-create-result-info flex flex-col gap-3 border border-border px-4 py-4" data-create-result-info="true">',
    'result info class',
)
replace_once(
    '<div className="flex items-center gap-2" aria-label="Continue from result">',
    '<div className="clear-create-result-actions flex items-center gap-2" aria-label="Continue from result">',
    'result actions class',
)
replace_once(
    '<div className="bg-surface-2">',
    '<div className="clear-create-result-media bg-surface-2" data-create-result-media={resultAsset.kind}>',
    'result media class',
)
replace_once(
    'className="max-h-[70vh] w-full object-contain"',
    'className="clear-create-result-asset max-h-[70vh] w-full object-contain"',
    'result image class',
)
replace_once(
    'className="max-h-[70vh] w-full"\n                    aria-label="Generated video"',
    'className="clear-create-result-asset max-h-[70vh] w-full"\n                    aria-label="Generated video"',
    'result video class',
)

workspace_path.write_text(source)

css = css_path.read_text()
if '/* Phase 23 Clear Composer */' in css:
    raise SystemExit('Phase 23 CSS already present')
css += r'''

/* Phase 23 Clear Composer */
.clear-create-workspace {
  position: relative;
  isolation: isolate;
  overflow: clip;
}

.clear-create-workspace::before,
.clear-create-workspace::after {
  position: absolute;
  pointer-events: none;
  content: "";
}

.clear-create-workspace::before {
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(rgb(255 255 255 / 1.7%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 1.7%) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 86% 74% at 50% 26%, #000 0%, rgb(0 0 0 / 82%) 54%, transparent 94%);
}

.clear-create-workspace::after {
  top: 2rem;
  left: 50%;
  z-index: -1;
  width: min(70rem, 92vw);
  height: 42rem;
  transform: translateX(-50%);
  background:
    radial-gradient(circle at 76% 16%, rgb(115 215 255 / 9%), transparent 31%),
    radial-gradient(circle at 24% 68%, rgb(234 116 77 / 6%), transparent 27%),
    radial-gradient(circle at 50% 46%, rgb(129 114 246 / 2.5%), transparent 58%);
  filter: blur(46px);
}

.clear-create-stack {
  display: flex;
  flex-direction: column;
}

.clear-create-context {
  order: 0;
  width: min(56rem, 100%);
  margin-inline: auto;
}

.clear-create-context::after {
  display: block;
  width: min(26rem, 56vw);
  height: 1px;
  margin-top: 1.15rem;
  background: linear-gradient(90deg, rgb(115 215 255 / 34%), rgb(255 255 255 / 7%) 44%, transparent);
  content: "";
}

.clear-create-context h2 {
  line-height: 0.98;
  letter-spacing: -0.055em;
}

.clear-create-context > p {
  max-width: 42rem;
}

.clear-create-composer {
  order: 2;
  display: flex;
  width: min(56rem, 100%);
  flex-direction: column;
  margin-inline: auto;
  border-color: rgb(255 255 255 / 14%);
  background: linear-gradient(180deg, rgb(14 20 29 / 96%), rgb(8 13 19 / 97%));
  box-shadow: 0 28px 90px rgb(0 0 0 / 36%), inset 0 1px rgb(255 255 255 / 5%);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.clear-create-composer::before {
  inset: auto -8rem -10rem auto;
  width: 18rem;
  height: 18rem;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 34%, rgb(115 215 255 / 8%), transparent 42%),
    radial-gradient(circle at 66% 66%, rgb(234 116 77 / 5%), transparent 44%);
  filter: blur(28px);
  opacity: 0.72;
  transform: none;
}

.clear-create-composer[data-create-mode="video"]::before {
  inset: auto auto -10rem -8rem;
  background:
    radial-gradient(circle at 68% 30%, rgb(115 215 255 / 8%), transparent 42%),
    radial-gradient(circle at 34% 70%, rgb(234 116 77 / 5%), transparent 44%);
}

.clear-create-composer::after {
  inset: -2.25rem -2.25rem auto auto;
  width: 5.5rem;
  height: 5.5rem;
  border-top: 1px solid rgb(234 116 77 / 20%);
  border-right: 1px solid rgb(115 215 255 / 22%);
  border-radius: 0 100% 0 0;
  background: none;
  box-shadow: 0 0 52px rgb(115 215 255 / 4%);
}

.clear-create-composer:focus-within {
  border-color: rgb(115 215 255 / 24%);
  box-shadow: 0 30px 96px rgb(0 0 0 / 38%), inset 0 1px rgb(255 255 255 / 6%);
}

.clear-create-composer:focus-within::before {
  transform: none;
}

.clear-composer-mode {
  order: 1;
  margin: 0 0 0.65rem;
}

.clear-composer-mode [role="radiogroup"] {
  width: 13.5rem;
  min-height: 2.75rem;
  border-color: rgb(255 255 255 / 10%);
  background: rgb(8 13 19 / 86%);
}

.clear-composer-mode [role="radio"] {
  min-height: 2.25rem;
  flex: 1 1 0;
  padding-inline: 1rem !important;
}

.clear-composer-reference-bar {
  order: 2;
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.1rem 0.1rem 0.65rem;
}

.clear-composer-reference-trigger {
  min-height: 2.75rem;
  border-color: rgb(255 255 255 / 11%);
  background: #101720;
  font-weight: 700;
}

.clear-composer-reference-help {
  color: rgb(156 163 175 / 74%);
  font-size: 0.75rem;
}

.clear-composer-reference-list {
  order: 3;
}

.clear-composer-prompt {
  order: 4;
  border-top: 1px solid rgb(255 255 255 / 7%);
  border-bottom: 1px solid rgb(255 255 255 / 7%);
  border-radius: 0;
}

.clear-composer-controls {
  order: 5;
}

.clear-create-composer .kinetic-control-deck {
  margin-top: 0.75rem;
  border-color: rgb(255 255 255 / 8%);
  background: rgb(6 10 15 / 58%);
  box-shadow: inset 0 1px rgb(255 255 255 / 4%);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.clear-composer-settings > * {
  flex-shrink: 0;
}

.clear-composer-advanced-trigger {
  width: auto !important;
}

.clear-create-composer .kinetic-reference {
  border-color: rgb(255 255 255 / 10%);
  border-radius: 0.75rem;
  background: linear-gradient(90deg, rgb(115 215 255 / 4%), transparent 34%, rgb(234 116 77 / 2.5%)), #0c121a;
  box-shadow: inset 0 1px rgb(255 255 255 / 4%);
}

.clear-create-composer .kinetic-generate {
  border-color: rgb(255 255 255 / 78%);
  background: #f2f4f6;
  color: #070a0e;
  box-shadow: 0 12px 34px rgb(0 0 0 / 26%), inset 0 1px rgb(255 255 255 / 82%);
}

.clear-create-composer .kinetic-generate:disabled {
  border-color: rgb(255 255 255 / 9%);
  background: #303640;
  color: rgb(255 255 255 / 52%);
  box-shadow: inset 0 1px rgb(255 255 255 / 5%);
}

.clear-create-composer .kinetic-generate[data-active="true"]::before {
  background: linear-gradient(90deg, transparent, rgb(115 215 255 / 20%), rgb(234 116 77 / 14%), transparent);
}

.clear-create-stage,
.clear-create-result-loading,
.clear-create-result {
  order: 1;
  width: min(70rem, 100%);
  margin-inline: auto;
  margin-bottom: 1.5rem;
}

.clear-create-stage[data-active="true"] {
  position: relative;
  min-height: 25rem;
  display: grid;
  place-items: center;
  border-color: rgb(115 215 255 / 18%);
  border-radius: 1.125rem;
  background:
    linear-gradient(90deg, transparent 49.92%, rgb(255 255 255 / 2.4%) 50%, transparent 50.08%),
    linear-gradient(transparent 49.92%, rgb(255 255 255 / 2.1%) 50%, transparent 50.08%),
    radial-gradient(circle at 76% 18%, rgb(115 215 255 / 7%), transparent 28%),
    radial-gradient(circle at 19% 82%, rgb(234 116 77 / 5%), transparent 25%),
    #080d14;
  box-shadow: 0 38px 120px rgb(0 0 0 / 44%), -34px 24px 120px rgb(234 116 77 / 3%), 42px -28px 140px rgb(115 215 255 / 4.5%), inset 0 1px rgb(255 255 255 / 4%);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.clear-create-stage[data-active="true"]::before,
.clear-create-stage[data-active="true"]::after {
  position: absolute;
  pointer-events: none;
  content: "";
}

.clear-create-stage[data-active="true"]::before {
  inset: 8% 8%;
  background:
    linear-gradient(90deg, transparent, rgb(115 215 255 / 20%), transparent) 50% 50% / 100% 1px no-repeat,
    linear-gradient(180deg, transparent, rgb(115 215 255 / 16%), transparent) 50% 50% / 1px 100% no-repeat;
  animation: clear-create-registration 1.6s cubic-bezier(.22, 1, .36, 1) infinite alternate;
}

.clear-create-stage[data-active="true"]::after {
  right: -4.5rem;
  bottom: -4.5rem;
  width: 13.75rem;
  height: 13.75rem;
  border-top: 1px solid rgb(234 116 77 / 24%);
  border-left: 1px solid rgb(115 215 255 / 30%);
  border-radius: 100% 0 0 0;
  box-shadow: 0 0 80px rgb(115 215 255 / 8%);
}

.clear-create-stage-content {
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.clear-create-stage-content .kinetic-lifecycle-orb {
  display: none;
}

.clear-create-stage-copy {
  display: grid;
  gap: 0.45rem;
  justify-items: center;
}

.clear-create-stage-kicker {
  color: rgb(255 255 255 / 38%);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.clear-create-stage-copy strong {
  font-size: 1.35rem;
  letter-spacing: -0.025em;
}

.clear-create-stage-copy small {
  color: var(--color-text-muted);
  font-size: 0.76rem;
}

.clear-create-stage:not([data-active="true"]) {
  width: min(56rem, 100%);
  min-height: auto;
  border-radius: 0.75rem;
}

.clear-create-result-loading {
  min-height: 20rem;
  background: #080d14;
}

.clear-create-result {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 17.5rem;
  gap: 0.875rem;
  overflow: visible !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.clear-create-result-media {
  position: relative;
  grid-column: 1;
  grid-row: 1;
  display: grid;
  min-height: 30rem;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 16%);
  border-radius: 1.125rem;
  background:
    linear-gradient(90deg, transparent 49.92%, rgb(255 255 255 / 2.2%) 50%, transparent 50.08%),
    linear-gradient(transparent 49.92%, rgb(255 255 255 / 2%) 50%, transparent 50.08%),
    radial-gradient(circle at 76% 18%, rgb(115 215 255 / 6%), transparent 28%),
    radial-gradient(circle at 19% 82%, rgb(234 116 77 / 4%), transparent 25%),
    #080d14;
  box-shadow: 0 38px 120px rgb(0 0 0 / 44%), -28px 22px 90px rgb(234 116 77 / 5%), 34px -18px 100px rgb(115 215 255 / 6%), inset 0 1px rgb(255 255 255 / 4%);
  transform-style: preserve-3d;
  transition: transform 240ms cubic-bezier(.22, 1, .36, 1), border-color 180ms ease;
}

.clear-create-result-media::before,
.clear-create-result-media::after {
  position: absolute;
  z-index: 2;
  pointer-events: none;
}

.clear-create-result-media::before {
  top: 1rem;
  right: 1rem;
  width: 3rem;
  height: 3rem;
  border-top: 1px solid rgb(234 116 77 / 32%);
  border-right: 1px solid rgb(115 215 255 / 34%);
  border-radius: 0 100% 0 0;
  content: "";
}

.clear-create-result-media::after {
  bottom: 1rem;
  left: 1rem;
  color: rgb(255 255 255 / 38%);
  content: "RL / MEDIA REGISTRATION  01";
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.clear-create-result-asset {
  position: relative;
  z-index: 1;
  max-width: 100%;
}

.clear-create-result-info {
  position: relative;
  grid-column: 2;
  grid-row: 1;
  align-items: stretch !important;
  justify-content: flex-start !important;
  border-color: rgb(255 255 255 / 10%) !important;
  border-radius: 0.25rem 1.125rem 1.125rem 0.25rem;
  background: linear-gradient(180deg, rgb(14 21 31 / 96%), rgb(8 13 20 / 96%));
  box-shadow: inset 0 1px rgb(255 255 255 / 4%);
}

.clear-create-result-info::before {
  position: absolute;
  inset: 1rem auto 1rem 0;
  width: 1px;
  background: linear-gradient(180deg, rgb(115 215 255 / 56%), rgb(255 255 255 / 5%) 48%, rgb(234 116 77 / 44%));
  content: "";
}

.clear-create-result-actions {
  display: grid !important;
  width: 100%;
  gap: 0.5rem !important;
  margin-top: auto;
}

.clear-create-result-actions > * {
  width: 100%;
  justify-content: flex-start;
}

@media (hover: hover) and (pointer: fine) {
  .clear-create-result-media:hover {
    border-color: rgb(115 215 255 / 24%);
    transform: perspective(1200px) translateY(-2px) scale(1.006);
  }
}

@media (max-width: 640px) {
  .clear-create-workspace {
    padding-top: 2rem;
  }

  .clear-create-context h2 {
    font-size: 2.4rem !important;
  }

  .clear-create-context::after {
    width: 56%;
    margin-top: 0.9rem;
  }

  .clear-create-composer::after {
    top: -1.75rem;
    right: -1.75rem;
    width: 4.25rem;
    height: 4.25rem;
  }

  .clear-composer-mode [role="radiogroup"] {
    width: 100%;
  }

  .clear-composer-mode [role="radio"],
  .clear-composer-reference-trigger,
  .clear-composer-settings button {
    min-height: 2.75rem;
  }

  .clear-composer-reference-bar {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.4rem;
  }

  .clear-composer-settings {
    gap: 0.5rem;
  }

  .clear-composer-settings > * {
    min-width: 0;
  }

  .clear-create-result,
  .clear-create-result-loading,
  .clear-create-stage,
  .clear-create-stage:not([data-active="true"]) {
    width: 100%;
  }

  .clear-create-stage[data-active="true"] {
    min-height: 17.5rem;
  }

  .clear-create-stage[data-active="true"]::after {
    right: -3.5rem;
    bottom: -3.5rem;
    width: 10rem;
    height: 10rem;
  }

  .clear-create-result {
    grid-template-columns: minmax(0, 1fr);
  }

  .clear-create-result-media {
    grid-column: 1;
    grid-row: 1;
    min-height: 17.5rem;
  }

  .clear-create-result-info {
    grid-column: 1;
    grid-row: 2;
    border-radius: 0.9rem;
  }

  .clear-create-result-info::before {
    inset: 0 1rem auto;
    width: auto;
    height: 1px;
    background: linear-gradient(90deg, rgb(234 116 77 / 36%), rgb(255 255 255 / 5%) 48%, rgb(115 215 255 / 48%));
  }

  .clear-create-result-media::after {
    bottom: 0.75rem;
    left: 0.75rem;
    font-size: 0.44rem;
  }
}

@keyframes clear-create-registration {
  from { opacity: 0.28; transform: scale(0.64); }
  to { opacity: 0.9; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .clear-create-workspace::after,
  .clear-create-composer,
  .clear-create-composer::before,
  .clear-create-result-media {
    transition: none;
  }

  .clear-create-stage[data-active="true"]::before {
    animation: none;
    opacity: 0.65;
    transform: none;
  }

  .clear-create-result-media:hover {
    transform: none;
  }
}
'''
css_path.write_text(css)

verifier = verifier_path.read_text()
verifier = verifier.replace(
    'assert(metrics.count >= 5, `${label} did not expose the expected compact primary controls: ${JSON.stringify(metrics)}`);',
    'assert(metrics.count >= 3, `${label} did not expose the expected essential Clear Composer controls: ${JSON.stringify(metrics)}`);',
)
verifier = verifier.replace(
    '  assert(metrics.flexWrap === "nowrap", `${label} primary controls are not constrained to one row: ${JSON.stringify(metrics)}`);\n',
    '',
)
verifier_path.write_text(verifier)

contract = contract_path.read_text()
contract = contract.replace(
    '**Status:** AUTHORIZED FOR IMPLEMENTATION / NOT STARTED',
    '**Status:** IMPLEMENTATION IN PROGRESS / MERGE NOT AUTHORIZED',
    1,
)
contract_path.write_text(contract)
