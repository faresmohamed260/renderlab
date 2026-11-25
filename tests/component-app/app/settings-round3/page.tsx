import { AccountSettings } from "@/features/account/account-settings";
import styles from "@/features/account/account-settings.module.css";

export default async function SettingsFixture({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const state = (await searchParams).state;
  const admin = state !== "member";
  const verified = state !== "challenge";
  const id = "fixture-account";
  const time = "2026-11-25T10:00:00Z";
  return <section className={styles.workspace}><h1>Settings</h1>
    <AccountSettings configured identity={{ id, email: "fixture@example.test" }}
      access={{ userId: id, role: admin ? "admin" : "member", status: "active", generationEnabled: null, maxActiveJobs: null, maxJobsPerHour: null, createdAt: time, updatedAt: time }}
      enforcementEnabled showAdminLink={admin} mfaState={verified ? "verified" : "verification-required"}
      sessions={[{ id: "fixture-session", isCurrent: true, createdAt: time, lastActiveAt: time, clientLabel: "Fixture browser" }]}
      profile={verified ? { displayName: "Fixture profile", avatarState: "none", avatarUpdatedAt: null, avatarUrl: null } : null} />
  </section>;
}
