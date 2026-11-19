"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  imageAspectRatios,
  videoDurations,
  videoResolutions,
  type OutputKind,
  type PresetAspectRatio,
  type VideoResolution,
} from "@/lib/capabilities/generation";
import type { RenderLabAccountPreferences, RenderLabCreatePreferences } from "@/server/account/account-preferences";
import styles from "./account-settings.module.css";

type Feedback = { kind: "error" | "success"; message: string } | null;
type BusyAction = "save" | "reset" | null;

export function AccountPreferencesForm({ initialPreferences }: { initialPreferences: RenderLabAccountPreferences }) {
  const [source, setSource] = useState(initialPreferences.source);
  const [create, setCreate] = useState<RenderLabCreatePreferences>(initialPreferences.create);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState<BusyAction>(null);

  function patchCreate(patch: Partial<RenderLabCreatePreferences>) {
    setCreate((current) => ({ ...current, ...patch }));
    setFeedback(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusy("save");
    try {
      const response = await fetch("/api/account/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ create }),
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
      setCreate(payload.preferences.create);
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
      setCreate(payload.preferences.create);
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
                  <FieldLabel htmlFor="preferences-output-kind">Default Create mode</FieldLabel>
                  <NativeSelect
                    id="preferences-output-kind"
                    value={create.outputKind}
                    onChange={(event) => patchCreate({ outputKind: event.target.value as OutputKind })}
                    disabled={busy !== null}
                  >
                    <NativeSelectOption value="image">Image</NativeSelectOption>
                    <NativeSelectOption value="video">Video</NativeSelectOption>
                  </NativeSelect>
                  <FieldDescription>Used only for a new Create draft with no saved recipe or media continuation.</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="preferences-image-aspect">Default Image aspect ratio</FieldLabel>
                  <NativeSelect
                    id="preferences-image-aspect"
                    value={create.imageAspectRatio}
                    onChange={(event) => patchCreate({ imageAspectRatio: event.target.value as PresetAspectRatio })}
                    disabled={busy !== null}
                  >
                    {imageAspectRatios.map((ratio) => (
                      <NativeSelectOption key={ratio} value={ratio}>{ratio}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>Original is source-aware and remains reserved for explicit media continuation.</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="preferences-video-resolution">Default Video resolution</FieldLabel>
                  <NativeSelect
                    id="preferences-video-resolution"
                    value={create.videoResolution}
                    onChange={(event) => patchCreate({ videoResolution: event.target.value as VideoResolution })}
                    disabled={busy !== null}
                  >
                    {videoResolutions.map((resolution) => (
                      <NativeSelectOption key={resolution} value={resolution}>{resolution}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>

                <Field>
                  <FieldLabel htmlFor="preferences-video-duration">Default Video duration</FieldLabel>
                  <NativeSelect
                    id="preferences-video-duration"
                    value={String(create.videoDurationSeconds)}
                    onChange={(event) => patchCreate({
                      videoDurationSeconds: Number(event.target.value) as RenderLabCreatePreferences["videoDurationSeconds"],
                    })}
                    disabled={busy !== null}
                  >
                    {videoDurations.map((duration) => (
                      <NativeSelectOption key={duration} value={String(duration)}>{duration} seconds</NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>

                <Field>
                  <FieldLabel htmlFor="preferences-video-audio">Default Video audio</FieldLabel>
                  <NativeSelect
                    id="preferences-video-audio"
                    value={create.videoAudioEnabled ? "on" : "off"}
                    onChange={(event) => patchCreate({ videoAudioEnabled: event.target.value === "on" })}
                    disabled={busy !== null}
                  >
                    <NativeSelectOption value="on">On</NativeSelectOption>
                    <NativeSelectOption value="off">Off</NativeSelectOption>
                  </NativeSelect>
                  <FieldDescription>Applies to clean new Video drafts only.</FieldDescription>
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
