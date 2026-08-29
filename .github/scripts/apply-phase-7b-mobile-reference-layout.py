from pathlib import Path

path = Path("src/features/create/create-workspace.tsx")
text = path.read_text()

replacements = [
    (
        'className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-2"',
        'className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 p-2 sm:flex-nowrap sm:gap-3"',
    ),
    (
        '<div className="min-w-0 flex-1">\n                    <p className="truncate text-sm font-semibold text-text">',
        '<div className="min-w-32 flex-1 sm:min-w-0">\n                    <p className="truncate text-sm font-semibold text-text">',
    ),
    (
        '                  <CreateReferenceMentionMenu\n                    triggerAlias={reference.alias}',
        '                  <div className="ml-auto flex items-center gap-1 sm:contents">\n                    <CreateReferenceMentionMenu\n                      triggerAlias={reference.alias}',
    ),
    (
        '''                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeReference(reference.alias)}
                    disabled={referenceUploading}
                    aria-label={`Remove @${reference.alias}`}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>''',
        '''                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeReference(reference.alias)}
                      disabled={referenceUploading}
                      aria-label={`Remove @${reference.alias}`}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                </div>''',
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match, found {count}: {old[:100]!r}")
    text = text.replace(old, new, 1)

path.write_text(text)
print("Applied Phase 7B mobile reference layout polish.")
