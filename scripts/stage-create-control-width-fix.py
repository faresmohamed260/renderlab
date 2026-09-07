from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one exact match, found {count}\n--- target ---\n{old}")
    p.write_text(text.replace(old, new, 1))


workspace = "src/features/create/create-workspace.tsx"

# Keep full visible/accessibility labels while removing chevrons from flex width.
replace_once(
    workspace,
    '''          className="shrink-0 gap-1 px-2"
        >
          <span>{imageModelTriggerLabels[value]}</span>
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />''',
    '''          className="relative shrink-0 gap-0 !pl-1.5 !pr-4"
        >
          <span>{imageModelTriggerLabels[value]}</span>
          <ChevronDown aria-hidden="true" className="absolute right-1 size-3 opacity-70" />''',
)

replace_once(
    workspace,
    '''          className="shrink-0 gap-1 px-2"
        >
          {value === "original" ? "Original" : value}
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />''',
    '''          className="relative shrink-0 gap-0 !pl-1.5 !pr-4"
        >
          {value === "original" ? "Original" : value}
          <ChevronDown aria-hidden="true" className="absolute right-1 size-3 opacity-70" />''',
)

replace_once(
    workspace,
    '''          className="shrink-0 gap-1 px-2"
        >
          <span>{resolution} · {durationSeconds} s</span>
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />''',
    '''          className="relative shrink-0 gap-0 !pl-1.5 !pr-4"
        >
          <span>{resolution} · {durationSeconds} s</span>
          <ChevronDown aria-hidden="true" className="absolute right-1 size-3 opacity-70" />''',
)

replace_once(
    workspace,
    '''                  variant="secondary"
                  size="icon-sm"
                  disabled={''',
    '''                  variant="secondary"
                  size="xs"
                  className="size-8 !px-0"
                  disabled={''',
)

replace_once(
    workspace,
    '''                  <ToggleGroupItem value="image" className="px-1.5">Image</ToggleGroupItem>
                  <ToggleGroupItem value="video" className="px-1.5">Video</ToggleGroupItem>''',
    '''                  <ToggleGroupItem value="image" className="!px-1">Image</ToggleGroupItem>
                  <ToggleGroupItem value="video" className="!px-1">Video</ToggleGroupItem>''',
)

replace_once(
    workspace,
    '''                    variant="secondary"
                    size="icon-sm"
                    aria-pressed={advancedOpen}''',
    '''                    variant="secondary"
                    size="xs"
                    aria-pressed={advancedOpen}''',
)

replace_once(
    workspace,
    '''                    title="Advanced generation controls"
                    className={advancedOpen ? "bg-surface-3" : undefined}''',
    '''                    title="Advanced generation controls"
                    className={`size-8 !px-0${advancedOpen ? " bg-surface-3" : ""}`}''',
)
