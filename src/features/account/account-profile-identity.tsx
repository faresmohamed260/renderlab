import { UserRound } from "lucide-react";
import type { RenderLabAccountProfile } from "@/server/account/account-profile";
import styles from "./account-settings.module.css";

function displayInitials(displayName: string | null) {
  if (!displayName) return null;
  const words = displayName.trim().split(/\s+/u).filter(Boolean);
  if (!words.length) return null;
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join("").toLocaleUpperCase();
  return `${Array.from(words[0])[0] ?? ""}${Array.from(words[words.length - 1])[0] ?? ""}`.toLocaleUpperCase();
}

export function AccountProfileIdentity({
  profile,
  large = false,
}: {
  profile: RenderLabAccountProfile;
  large?: boolean;
}) {
  const initials = displayInitials(profile.displayName);
  const avatarSrc = profile.avatarUrl
    ? `${profile.avatarUrl}${profile.avatarUpdatedAt ? `?v=${encodeURIComponent(profile.avatarUpdatedAt)}` : ""}`
    : null;

  return (
    <div className={styles.profileIdentity} data-large={large ? "true" : undefined}>
      <div className={styles.profileAvatar} aria-label={avatarSrc ? "Current profile picture" : "Profile picture placeholder"}>
        {avatarSrc ? (
          <img className={styles.profileAvatarImage} src={avatarSrc} alt="" />
        ) : initials ? (
          <span className={styles.profileInitials} aria-hidden="true">{initials}</span>
        ) : (
          <UserRound aria-hidden="true" />
        )}
      </div>
      <div className={styles.valueStack}>
        <p className={styles.valueLabel}>Profile</p>
        <p className={styles.profileName}>{profile.displayName ?? "No display name"}</p>
        <p className={styles.helper}>Display identity only. It does not change sign-in, access, role or ownership.</p>
      </div>
    </div>
  );
}
