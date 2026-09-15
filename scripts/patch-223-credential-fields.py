from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing marker in {path}: {old[:140]!r}")
    p.write_text(text.replace(old, new, 1))


# Signed-out sign-in.
path = "src/features/account/account-settings.tsx"
replace_once(
    path,
    'import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";\n',
    'import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";\n',
)
replace_once(
    path,
    'import { AccountDataPrivacy } from "./account-data-privacy";\n',
    'import { AccountDataPrivacy } from "./account-data-privacy";\nimport { AccountPasswordField } from "./account-password-field";\n',
)
replace_once(
    path,
    '''            <Field>\n              <div className={styles.fieldHeader}>\n                <FieldLabel htmlFor="account-password">Password</FieldLabel>\n                <Button type="button" variant="link" size="lg" disabled={busyAction !== null || !email.trim()} onClick={handleRecovery} className={styles.recoveryButton}>\n                  {busyAction === "recovery" ? <Spinner aria-hidden="true" /> : null}\n                  Forgot password\n                </Button>\n              </div>\n              <Input id="account-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />\n              <FieldDescription>Use your invited RenderLab account credentials.</FieldDescription>\n              <FieldError>{feedback?.kind === "error" ? feedback.message : null}</FieldError>\n            </Field>''',
    '''            <AccountPasswordField\n              id="account-password"\n              name="password"\n              label="Password"\n              autoComplete="current-password"\n              value={password}\n              onChange={setPassword}\n              description="Use your invited RenderLab account credentials."\n              error={feedback?.kind === "error" ? feedback.message : null}\n              required\n              labelAction={(\n                <Button type="button" variant="link" size="lg" disabled={busyAction !== null || !email.trim()} onClick={handleRecovery} className={styles.recoveryButton}>\n                  {busyAction === "recovery" ? <Spinner aria-hidden="true" /> : null}\n                  Forgot password\n                </Button>\n              )}\n            />''',
)

# Email-change reauthentication.
path = "src/features/account/account-email-form.tsx"
replace_once(
    path,
    'import styles from "./account-settings.module.css";\n',
    'import { AccountPasswordField } from "./account-password-field";\nimport styles from "./account-settings.module.css";\n',
)
replace_once(
    path,
    '''                    {requiresCurrentPassword ? (\n                      <Field>\n                        <FieldLabel htmlFor="email-change-current-password">Current password</FieldLabel>\n                        <Input\n                          id="email-change-current-password"\n                          name="current-password"\n                          type="password"\n                          autoComplete="current-password"\n                          value={currentPassword}\n                          onChange={(event) => setCurrentPassword(event.target.value)}\n                          required\n                        />\n                        <FieldDescription>RenderLab verifies the current password before starting this sensitive change.</FieldDescription>\n                      </Field>\n                    ) : (''',
    '''                    {requiresCurrentPassword ? (\n                      <AccountPasswordField\n                        id="email-change-current-password"\n                        name="current-password"\n                        label="Current password"\n                        autoComplete="current-password"\n                        value={currentPassword}\n                        onChange={setCurrentPassword}\n                        description="RenderLab verifies the current password before starting this sensitive change."\n                        required\n                      />\n                    ) : (''',
)

# Destructive-action reauthentication.
path = "src/features/account/account-data-privacy.tsx"
replace_once(
    path,
    'import styles from "./account-settings.module.css";\n',
    'import { AccountPasswordField } from "./account-password-field";\nimport styles from "./account-settings.module.css";\n',
)
replace_once(
    path,
    '''              <Field>\n                <FieldLabel htmlFor="delete-account-password">Current password</FieldLabel>\n                <Input id="delete-account-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />\n              </Field>''',
    '''              <AccountPasswordField\n                id="delete-account-password"\n                label="Current password"\n                autoComplete="current-password"\n                value={currentPassword}\n                onChange={setCurrentPassword}\n              />''',
)

# Ordinary and recovery password replacement.
path = "src/features/account/account-password-form.tsx"
replace_once(
    path,
    'import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";\nimport { Input } from "@/components/ui/input";\n',
    'import { FieldGroup } from "@/components/ui/field";\n',
)
replace_once(
    path,
    'import styles from "./account-settings.module.css";\n',
    'import { AccountPasswordField } from "./account-password-field";\nimport styles from "./account-settings.module.css";\n',
)
replace_once(
    path,
    '''              <FieldGroup>\n                {!recoveryMode ? (\n                  <Field>\n                    <FieldLabel htmlFor="current-password">Current password</FieldLabel>\n                    <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />\n                  </Field>\n                ) : null}\n                <Field>\n                  <FieldLabel htmlFor="new-password">New password</FieldLabel>\n                  <Input id="new-password" type="password" autoComplete="new-password" minLength={RENDERLAB_PASSWORD_MIN_LENGTH} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />\n                  <FieldDescription>{RENDERLAB_PASSWORD_REQUIREMENT}</FieldDescription>\n                </Field>\n                <Field>\n                  <FieldLabel htmlFor="confirm-new-password">Confirm new password</FieldLabel>\n                  <Input id="confirm-new-password" type="password" autoComplete="new-password" minLength={RENDERLAB_PASSWORD_MIN_LENGTH} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />\n                </Field>\n              </FieldGroup>''',
    '''              <FieldGroup>\n                {!recoveryMode ? (\n                  <AccountPasswordField\n                    id="current-password"\n                    label="Current password"\n                    autoComplete="current-password"\n                    value={currentPassword}\n                    onChange={setCurrentPassword}\n                    required\n                  />\n                ) : null}\n                <AccountPasswordField\n                  id="new-password"\n                  label="New password"\n                  autoComplete="new-password"\n                  minLength={RENDERLAB_PASSWORD_MIN_LENGTH}\n                  value={newPassword}\n                  onChange={setNewPassword}\n                  description={RENDERLAB_PASSWORD_REQUIREMENT}\n                  statusMessage={newPassword ? (meetsRenderLabPasswordPolicy(newPassword) ? "Length requirement met." : RENDERLAB_PASSWORD_REQUIREMENT) : undefined}\n                  statusKind={newPassword && !meetsRenderLabPasswordPolicy(newPassword) ? "error" : "success"}\n                  required\n                />\n                <AccountPasswordField\n                  id="confirm-new-password"\n                  label="Confirm new password"\n                  autoComplete="new-password"\n                  minLength={RENDERLAB_PASSWORD_MIN_LENGTH}\n                  value={confirmPassword}\n                  onChange={setConfirmPassword}\n                  statusMessage={confirmPassword ? (newPassword === confirmPassword ? "Passwords match" : "Passwords do not match") : undefined}\n                  statusKind={confirmPassword && newPassword !== confirmPassword ? "error" : "success"}\n                  required\n                />\n              </FieldGroup>''',
)
