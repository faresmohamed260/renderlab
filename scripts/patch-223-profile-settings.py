from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing marker in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


# Server Settings projection.
path = "src/app/(app)/settings/page.tsx"
replace_once(
    path,
    'import { getRenderLabSessionSummaries } from "@/server/account/account-sessions";\n',
    'import { getRenderLabSessionSummaries } from "@/server/account/account-sessions";\nimport { getRenderLabAccountProfile, type RenderLabAccountProfile } from "@/server/account/account-profile";\n',
)
replace_once(
    path,
    '''  const showAdminLink = Boolean(identity && access?.status === "active" && access.role === "admin");\n\n  const intro = !configured''',
    '''  let profile: RenderLabAccountProfile | null = null;\n  if (identity && access && (mfaState === "disabled" || mfaState === "verified")) {\n    try {\n      profile = await getRenderLabAccountProfile(identity.id);\n    } catch {\n      profile = null;\n    }\n  }\n\n  const showAdminLink = Boolean(identity && access?.status === "active" && access.role === "admin");\n\n  const intro = !configured''',
)
replace_once(
    path,
    '''        mfaState={mfaState}\n        sessions={sessions}\n      />''',
    '''        mfaState={mfaState}\n        sessions={sessions}\n        profile={profile}\n      />''',
)

# Settings Account row.
path = "src/features/account/account-settings.tsx"
replace_once(
    path,
    'import type { RenderLabAccountAccess } from "@/server/account/account-access";\n',
    'import type { RenderLabAccountAccess } from "@/server/account/account-access";\nimport type { RenderLabAccountProfile } from "@/server/account/account-profile";\n',
)
replace_once(
    path,
    'import { AccountPasswordField } from "./account-password-field";\n',
    'import { AccountPasswordField } from "./account-password-field";\nimport { AccountProfileIdentity } from "./account-profile-identity";\n',
)
replace_once(
    path,
    '''  mfaState,\n  sessions,\n}: {\n''',
    '''  mfaState,\n  sessions,\n  profile,\n}: {\n''',
)
replace_once(
    path,
    '''  mfaState: MfaState;\n  sessions: RenderLabSessionSummary[] | null;\n}) {''',
    '''  mfaState: MfaState;\n  sessions: RenderLabSessionSummary[] | null;\n  profile: RenderLabAccountProfile | null;\n}) {''',
)
old_account = '''          <RegisterRow index="01" title="Account">\n            <div className={styles.actionRow}>\n              <div className={styles.valueStack}>\n                <p className={styles.valueLabel}>Sign-in email</p>\n                <p className={styles.emailValue}>{identity.email ?? "RenderLab account"}</p>\n                <p className={styles.helper}>Used to sign in. Changing it keeps the same RenderLab account, access and ownership.</p>\n              </div>\n              <Button asChild variant="secondary" size="lg">\n                <Link href="/settings/email">Change email</Link>\n              </Button>\n            </div>\n          </RegisterRow>'''
new_account = '''          <RegisterRow index="01" title="Account">\n            <div className={styles.passwordStack}>\n              {access ? (\n                profile ? (\n                  <div className={styles.actionRow}>\n                    <AccountProfileIdentity profile={profile} />\n                    <Button asChild variant="secondary" size="lg">\n                      <Link href="/settings/profile">Edit profile</Link>\n                    </Button>\n                  </div>\n                ) : mfaState === "verification-required" ? (\n                  <div className={styles.actionRow}>\n                    <div className={styles.valueStack}>\n                      <p className={styles.valueLabel}>Profile</p>\n                      <p className={styles.helper}>Verify your authenticator before viewing or editing private profile identity.</p>\n                    </div>\n                    <Button asChild variant="secondary" size="lg">\n                      <Link href={`/settings/mfa/challenge?next=${encodeURIComponent("/settings/profile")}`}>Verify MFA</Link>\n                    </Button>\n                  </div>\n                ) : (\n                  <div className={styles.valueStack}>\n                    <p className={styles.valueLabel}>Profile</p>\n                    <p className={styles.helper}>Private profile information is temporarily unavailable.</p>\n                  </div>\n                )\n              ) : null}\n              <div className={access ? styles.factorRow : styles.actionRow}>\n                <div className={styles.valueStack}>\n                  <p className={styles.valueLabel}>Sign-in email</p>\n                  <p className={styles.emailValue}>{identity.email ?? "RenderLab account"}</p>\n                  <p className={styles.helper}>Used to sign in. Changing it keeps the same RenderLab account, access and ownership.</p>\n                </div>\n                <Button asChild variant="secondary" size="lg">\n                  <Link href="/settings/email">Change email</Link>\n                </Button>\n              </div>\n            </div>\n          </RegisterRow>'''
replace_once(path, old_account, new_account)

# Data disclosure includes profile state.
path = "src/features/account/account-data-privacy.tsx"
replace_once(
    path,
    'RenderLab stores account/product metadata in Supabase and creative objects in Cloudflare R2.',
    'RenderLab stores account/product and private profile metadata in Supabase, plus creative objects and private profile-avatar bytes in Cloudflare R2.',
)

# Remove misleading HTML UTF-16 limit; server owns exact Unicode code-point policy.
path = "src/features/account/account-profile-form.tsx"
text = Path(path).read_text()
text = text.replace('                    maxLength={160}\n', '')
Path(path).write_text(text)

# Styles for profile identity and crop editor.
path = "src/features/account/account-settings.module.css"
css = Path(path).read_text()
marker = '''.factorRow {\n  display: flex;\n'''
insert = '''.profileIdentity {\n  display: flex;\n  min-width: 0;\n  align-items: center;\n  gap: 0.9rem;\n}\n\n.profileIdentity[data-large="true"] {\n  align-items: flex-start;\n}\n\n.profileAvatar {\n  display: grid;\n  width: 3.5rem;\n  height: 3.5rem;\n  flex: 0 0 auto;\n  place-items: center;\n  overflow: hidden;\n  border: 1px solid rgb(255 255 255 / 11%);\n  border-radius: 0.8rem;\n  background: rgb(255 255 255 / 3%);\n  color: var(--color-text-muted);\n}\n\n.profileIdentity[data-large="true"] .profileAvatar {\n  width: 5rem;\n  height: 5rem;\n  border-radius: 1rem;\n}\n\n.profileAvatar svg {\n  width: 1.25rem;\n  height: 1.25rem;\n}\n\n.profileAvatarImage {\n  display: block;\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n\n.profileInitials {\n  color: var(--color-text);\n  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;\n  font-size: 0.84rem;\n  font-weight: 700;\n  letter-spacing: 0.04em;\n}\n\n.profileName {\n  margin: 0;\n  overflow-wrap: anywhere;\n  color: var(--color-text);\n  font-size: 0.96rem;\n  font-weight: 600;\n  line-height: 1.45;\n}\n\n.profileEditor {\n  display: grid;\n  max-width: 40rem;\n  gap: 1.2rem;\n}\n\n.cropPanel {\n  display: grid;\n  gap: 0.9rem;\n  border-top: 1px solid rgb(255 255 255 / 8%);\n  padding-top: 1rem;\n}\n\n.cropStage {\n  position: relative;\n  width: min(100%, 22rem);\n  aspect-ratio: 1;\n  overflow: hidden;\n  border: 1px solid rgb(255 255 255 / 12%);\n  border-radius: 1rem;\n  background: rgb(0 0 0 / 26%);\n  outline: none;\n  cursor: grab;\n  touch-action: none;\n}\n\n.cropStage:active {\n  cursor: grabbing;\n}\n\n.cropStage:focus-visible {\n  border-color: var(--color-accent);\n  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 40%, transparent);\n}\n\n.cropImage {\n  display: block;\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n  user-select: none;\n  pointer-events: none;\n  transition: transform 120ms ease, object-position 120ms ease;\n}\n\n.cropGuide {\n  position: absolute;\n  inset: 0.75rem;\n  border: 1px solid rgb(255 255 255 / 45%);\n  border-radius: 50%;\n  box-shadow: 0 0 0 999px rgb(0 0 0 / 18%);\n  pointer-events: none;\n}\n\n.cropControls {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  flex-wrap: wrap;\n}\n\n.cropZoom {\n  min-width: 3.25rem;\n  color: var(--color-text-muted);\n  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;\n  font-size: 0.74rem;\n  text-align: center;\n}\n\n.factorRow {\n  display: flex;\n'''
if marker not in css:
    raise SystemExit("CSS factorRow marker missing")
css = css.replace(marker, insert, 1)
css = css.replace(
    '''  .valueHeader,\n  .actionRow,\n  .factorRow {''',
    '''  .valueHeader,\n  .actionRow,\n  .factorRow {''',
    1,
)
css = css.replace(
    '''  .enrollmentGrid {\n    grid-template-columns: minmax(0, 1fr);\n  }''',
    '''  .enrollmentGrid {\n    grid-template-columns: minmax(0, 1fr);\n  }\n\n  .profileIdentity {\n    align-items: flex-start;\n  }\n\n  .profileIdentity[data-large="true"] {\n    flex-direction: column;\n  }\n\n  .cropStage {\n    width: 100%;\n  }\n\n  .cropControls [data-slot="button"]:last-child {\n    width: 100%;\n  }''',
    1,
)
css = css.replace(
    '''@media (prefers-reduced-motion: reduce) {\n  .backLink {\n    transition: none;\n  }\n}''',
    '''@media (prefers-reduced-motion: reduce) {\n  .backLink,\n  .cropImage {\n    transition: none;\n  }\n}''',
    1,
)
Path(path).write_text(css)
