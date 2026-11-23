"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { fiboImageAspectRatios, fiboPreferenceAspectRatio, type PresetAspectRatio } from "@/lib/capabilities/generation";
import type { RenderLabAccountPreferences } from "@/server/account/account-preferences";
import styles from "./account-settings.module.css";

type Feedback = { kind: "error" | "success"; message: string } | null;
type BusyAction = "save" | "reset" | null;

export function AccountPreferencesForm({ initialPreferences }: { initialPreferences: RenderLabAccountPreferences }) {
  const [source, setSource] = useState(initialPreferences.source);
  const [imageAspectRatio, setImageAspectRatio] = useState(() => fiboPreferenceAspectRatio(initialPreferences.create.imageAspectRatio));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState<BusyAction>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusy("save");
    try {
      const response = await fetch("/api/account/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ create: { imageAspectRatio } }),
      });
      const payload = await response.json().catch(() => null) as {
        preferences?: RenderLabAccountPreferences;
        error?: { code?: string };
      } | null;
      if (!response.ok || !payload?.preferences) {
        setFeedback({
          kind: "error",
          message: payload?.error?.code === "account_deletion_in_progress"
            ? "Account deletion is in progress, so preferences can no longer be changed."
            : "Create defaults could not be saved. Try again.",
        });
        return;
      }
      setSource(payload.preferences.source);
      setImageAspectRatio(fiboPreferenceAspectRatio(payload.preferences.create.imageAspectRatio));
      setFeedback({ kind: "success", message: "Create defaults saved." });
    } catch {
      setFeedback({ kind: "error", message: "Create defaults could not be saved. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    setFeedback(null);
    setBusy("reset");
    try {
      const response = await fetch("/api/account/preferences", { method: "DELETE" });
      const payload = await response.json().catch(() => null) as {
        preferences?: RenderLabAccountPreferences;
        error?: { code?: string };
      } | null;
      if (!response.ok || !payload?.preferences) {
        setFeedback({
          kind: "error",
          message: payload?.error?.code === "account_deletion_in_progress"
            ? "Account deletion is in progress, so preferences can no longer be changed."
            : "Create defaults could not be reset. Try again.",
        });
        return;
      }
      setSource(payload.preferences.source);
      setImageAspectRatio(fiboPreferenceAspectRatio(payload.preferences.create.imageAspectRatio));
      setFeedback({ kind: "success", message: "Following current RenderLab defaults." });
    } catch {
      setFeedback({ kind: "error", message: "Create defaults could not be reset. Try again." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <form className={styles.surfaceWrap} onSubmit={handleSave}>
      <div className={styles.register}>
        <span className={styles.signatureArc} aria-hidden="true" />
        <section className={styles.row}>
          <div className={styles.labelCell}>
            <span className={styles.index}>01</span>
            <h2 className={styles.sectionTitle}>Create</h2>
          </div>
          <div className={styles.valueCell}>
            <div className={styles.formStack}>
              <div className={styles.valueStack}>
                <p className={styles.valueLabel}>Account default state</p>
                <p className={styles.helper}>
                  {source === "saved"
                    ? "Using saved account defaults across signed-in devices."
                    : "Following the current RenderLab product defaults."}
                </p>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="preferences-image-aspect">Default Image aspect ratio</FieldLabel>
                  <NativeSelect
                    id="preferences-image-aspect"
                    value={imageAspectRatio}
                    onChange={(event) => {
                      setImageAspectRatio(event.target.value as PresetAspectRatio);
                      setFeedback(null);
                    }}
                    disabled={busy !== null}
                  >
                    {fiboImageAspectRatios.map((ratio) => (
                      <NativeSelectOption key={ratio} value={ratio}>{ratio}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>Original is source-aware and remains reserved for explicit media continuation.</FieldDescription>
                </Field>
              </FieldGroup>

              <p className={styles.helper}>
                These defaults never alter existing generations, media, history, saved recipes or explicit continuations.
              </p>

              <div className={styles.formActions}>
                <Button type="submit" size="lg" disabled={busy !== null}>
                  {busy === "save" ? <Spinner aria-hidden="true" /> : null}
                  Save defaults
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => void handleReset()}
                  disabled={busy !== null}
                >
                  {busy === "reset" ? <Spinner aria-hidden="true" /> : null}
                  Reset to RenderLab defaults
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {feedback ? (
        <Alert variant={feedback.kind === "error" ? "destructive" : "default"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
