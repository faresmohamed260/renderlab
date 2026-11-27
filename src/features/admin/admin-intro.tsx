import styles from "./admin-operations.module.css";

export function AdminIntro({ unavailable = false }: { unavailable?: boolean }) {
  return (
    <header className={styles.intro}>
      <p className={styles.eyebrow}>Privileged operations</p>
      <h1 className={styles.title}>Admin</h1>
      <p className={styles.lede}>
        {unavailable
          ? "Admin operations are temporarily unavailable."
          : "Owner-only. Read-only health first; controls arrive later and need approval."}
      </p>
    </header>
  );
}
