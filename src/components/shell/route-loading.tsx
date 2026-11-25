import { Skeleton } from "@/components/ui/skeleton";
import styles from "./route-loading.module.css";

type Surface = "create" | "activity";

/** A content boundary, not a generation status. Keep existing route chrome outside. */
export function RouteLoading({ surface }: { surface: Surface }) {
  return (
    <section data-route-loading={surface} className={surface === "create" ? styles.create : styles.activity} aria-label="Loading content">
      <p role="status" className={styles.status}>Loading content…</p>
      {surface === "create" ? (
        <div className={styles.createGrid} aria-hidden="true">
          <div className={styles.panel}>
            <Skeleton className={styles.line} />
            <Skeleton className={styles.prompt} />
            <Skeleton className={styles.field} />
            <Skeleton className={styles.field} />
            <Skeleton className={styles.field} />
          </div>
          <div className={styles.stage}>
            <Skeleton className={styles.media} />
            <Skeleton className={styles.field} />
          </div>
          <div className={styles.history}>
            <Skeleton className={styles.line} />
            {[0, 1, 2].map(index => <Skeleton key={index} className={styles.thumbnail} />)}
          </div>
        </div>
      ) : (
        <div className={styles.activityContent} aria-hidden="true">
          <Skeleton className={styles.title} />
          <Skeleton className={styles.line} />
          <div className={styles.activityGrid}>
            {[0, 1, 2].map(index => <Skeleton key={index} className={styles.card} />)}
          </div>
          {[0, 1, 2, 3].map(index => <Skeleton key={index} className={styles.row} />)}
        </div>
      )}
    </section>
  );
}
