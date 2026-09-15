"use client";

import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Minus, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { RenderLabAccountProfile, RenderLabAvatarCrop } from "@/server/account/account-profile";
import { AccountProfileIdentity } from "./account-profile-identity";
import styles from "./account-settings.module.css";

type Feedback = { kind: "error" | "success"; message: string } | null;
type BusyAction = "save" | "remove" | null;

const INITIAL_CROP: RenderLabAvatarCrop = { centerX: 0.5, centerY: 0.5, zoom: 1 };
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function AccountProfileForm({ initialProfile }: { initialProfile: RenderLabAccountProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [displayName, setDisplayName] = useState(initialProfile.displayName ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<RenderLabAvatarCrop>(INITIAL_CROP);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function selectFile(file: File | null) {
    setFeedback(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      setFeedback({ kind: "error", message: "Choose a JPEG, PNG or WebP image." });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFeedback({ kind: "error", message: "Profile pictures must be 3 MB or smaller." });
      return;
    }
    setSelectedFile(file);
    setCrop(INITIAL_CROP);
  }

  function nudgeCrop(dx: number, dy: number) {
    setCrop((current) => ({
      ...current,
      centerX: clamp(current.centerX + dx, 0, 1),
      centerY: clamp(current.centerY + dy, 0, 1),
    }));
  }

  function changeZoom(delta: number) {
    setCrop((current) => ({ ...current, zoom: clamp(Number((current.zoom + delta).toFixed(2)), 1, 8) }));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!previewUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!previewUrl || !drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = (event.clientX - drag.x) / rect.width / crop.zoom;
    const dy = (event.clientY - drag.y) / rect.height / crop.zoom;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    nudgeCrop(-dx, -dy);
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function handleCropKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const amount = event.shiftKey ? 0.05 : 0.015;
    if (event.key === "ArrowLeft") nudgeCrop(-amount, 0);
    else if (event.key === "ArrowRight") nudgeCrop(amount, 0);
    else if (event.key === "ArrowUp") nudgeCrop(0, -amount);
    else if (event.key === "ArrowDown") nudgeCrop(0, amount);
    else if (event.key === "+" || event.key === "=") changeZoom(0.1);
    else if (event.key === "-") changeZoom(-0.1);
    else return;
    event.preventDefault();
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusy("save");
    try {
      const profileResponse = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const profilePayload = await profileResponse.json().catch(() => null) as { profile?: RenderLabAccountProfile; error?: { code?: string } } | null;
      if (profileResponse.status === 403 && profilePayload?.error?.code === "mfa_required") {
        window.location.assign(`/settings/mfa/challenge?next=${encodeURIComponent("/settings/profile")}`);
        return;
      }
      if (!profileResponse.ok || !profilePayload?.profile) {
        setFeedback({ kind: "error", message: profilePayload?.error?.code === "profile_display_name_too_long" ? "Display name must be 80 characters or fewer." : "Profile could not be saved. Try again." });
        return;
      }
      let savedProfile = profilePayload.profile;

      if (selectedFile) {
        const form = new FormData();
        form.set("image", selectedFile);
        form.set("crop", JSON.stringify(crop));
        const avatarResponse = await fetch("/api/account/profile/avatar", { method: "POST", body: form });
        const avatarPayload = await avatarResponse.json().catch(() => null) as { profile?: RenderLabAccountProfile; error?: { code?: string } } | null;
        if (!avatarResponse.ok || !avatarPayload?.profile) {
          const code = avatarPayload?.error?.code;
          const message = code === "avatar_file_too_large"
            ? "Profile pictures must be 3 MB or smaller."
            : code === "avatar_dimensions_invalid"
              ? "Choose an image between 64×64 and 8192×8192 pixels."
              : code === "avatar_type_unsupported" || code === "avatar_animation_unsupported"
                ? "Choose a still JPEG, PNG or WebP image."
                : "Display name saved, but the profile picture could not be saved. Try another image.";
          setProfile(savedProfile);
          setFeedback({ kind: "error", message });
          return;
        }
        savedProfile = avatarPayload.profile;
      }

      setProfile(savedProfile);
      setDisplayName(savedProfile.displayName ?? "");
      setSelectedFile(null);
      setCrop(INITIAL_CROP);
      setFeedback({ kind: "success", message: "Profile updated." });
    } catch {
      setFeedback({ kind: "error", message: "Profile could not be saved. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function handleRemoveAvatar() {
    setFeedback(null);
    setBusy("remove");
    try {
      const response = await fetch("/api/account/profile/avatar", { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { profile?: RenderLabAccountProfile; cleanupPending?: boolean } | null;
      if (!response.ok && response.status !== 202) {
        setFeedback({ kind: "error", message: "Profile picture could not be removed. Try again." });
        return;
      }
      if (payload?.profile) setProfile(payload.profile);
      setSelectedFile(null);
      setCrop(INITIAL_CROP);
      setFeedback({
        kind: payload?.cleanupPending ? "success" : "success",
        message: payload?.cleanupPending
          ? "Profile picture removed. Storage cleanup will finish automatically."
          : "Profile picture removed.",
      });
    } catch {
      setFeedback({ kind: "error", message: "Profile picture could not be removed. Try again." });
    } finally {
      setBusy(null);
    }
  }

  const hasActiveAvatar = profile.avatarState === "active";

  return (
    <form onSubmit={handleSave}>
      <div className={styles.register}>
        <span className={styles.signatureArc} aria-hidden="true" />
        <section className={styles.row}>
          <div className={styles.labelCell}>
            <span className={styles.index}>01</span>
            <h2 className={styles.sectionTitle}>Profile</h2>
          </div>
          <div className={styles.valueCell}>
            <div className={styles.profileEditor}>
              <AccountProfileIdentity profile={profile} large />

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="profile-display-name">Display name</FieldLabel>
                  <Input
                    id="profile-display-name"
                    name="display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={160}
                    autoComplete="name"
                  />
                  <FieldDescription>Optional, non-unique display identity. RenderLab normalizes whitespace and stores up to 80 Unicode characters.</FieldDescription>
                </Field>
              </FieldGroup>

              <div className={styles.factorRow}>
                <div className={styles.valueStack}>
                  <p className={styles.valueLabel}>Profile picture</p>
                  <p className={styles.helper}>JPEG, PNG or WebP · 3 MB maximum · saved as a private 512×512 WebP.</p>
                </div>
                <div className={styles.buttonCluster}>
                  <input
                    ref={fileInputRef}
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    tabIndex={-1}
                    onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                  />
                  <Button type="button" variant="secondary" size="lg" onClick={() => fileInputRef.current?.click()} disabled={busy !== null}>
                    <Upload aria-hidden="true" />
                    {hasActiveAvatar ? "Replace" : "Upload"}
                  </Button>
                  {hasActiveAvatar ? (
                    <Button type="button" variant="destructive" size="lg" onClick={() => void handleRemoveAvatar()} disabled={busy !== null}>
                      {busy === "remove" ? <Spinner aria-hidden="true" /> : null}
                      Remove avatar
                    </Button>
                  ) : null}
                </div>
              </div>

              {previewUrl ? (
                <div className={styles.cropPanel}>
                  <div className={styles.valueStack}>
                    <p className={styles.valueLabel}>Crop preview</p>
                    <p className={styles.helper}>Drag to reposition. Keyboard: arrow keys move; + and − zoom. Shift + arrow moves farther.</p>
                  </div>
                  <div
                    className={styles.cropStage}
                    role="group"
                    aria-label="Profile picture crop preview"
                    tabIndex={0}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                    onKeyDown={handleCropKey}
                  >
                    <img
                      className={styles.cropImage}
                      src={previewUrl}
                      alt="Selected profile picture crop preview"
                      draggable={false}
                      style={{
                        objectPosition: `${crop.centerX * 100}% ${crop.centerY * 100}%`,
                        transform: `scale(${crop.zoom})`,
                        transformOrigin: `${crop.centerX * 100}% ${crop.centerY * 100}%`,
                      }}
                    />
                    <span className={styles.cropGuide} aria-hidden="true" />
                  </div>
                  <div className={styles.cropControls} aria-label="Crop controls">
                    <Button type="button" variant="secondary" size="icon-lg" aria-label="Move crop left" onClick={() => nudgeCrop(-0.025, 0)}><ArrowLeft aria-hidden="true" /></Button>
                    <Button type="button" variant="secondary" size="icon-lg" aria-label="Move crop up" onClick={() => nudgeCrop(0, -0.025)}><ArrowUp aria-hidden="true" /></Button>
                    <Button type="button" variant="secondary" size="icon-lg" aria-label="Move crop down" onClick={() => nudgeCrop(0, 0.025)}><ArrowDown aria-hidden="true" /></Button>
                    <Button type="button" variant="secondary" size="icon-lg" aria-label="Move crop right" onClick={() => nudgeCrop(0.025, 0)}><ArrowRight aria-hidden="true" /></Button>
                    <Button type="button" variant="secondary" size="icon-lg" aria-label="Zoom out" onClick={() => changeZoom(-0.1)} disabled={crop.zoom <= 1}><Minus aria-hidden="true" /></Button>
                    <span className={styles.cropZoom} aria-live="polite">{crop.zoom.toFixed(1)}×</span>
                    <Button type="button" variant="secondary" size="icon-lg" aria-label="Zoom in" onClick={() => changeZoom(0.1)} disabled={crop.zoom >= 8}><Plus aria-hidden="true" /></Button>
                    <Button type="button" variant="ghost" size="lg" onClick={() => setCrop(INITIAL_CROP)}>Reset crop</Button>
                  </div>
                </div>
              ) : null}

              {feedback ? (
                <Alert variant={feedback.kind === "error" ? "destructive" : "default"}>
                  <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
              ) : null}

              <div className={styles.formActions}>
                <Button type="submit" size="lg" disabled={busy !== null}>
                  {busy === "save" ? <Spinner aria-hidden="true" /> : null}
                  Save profile
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/settings">Back to Settings</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
