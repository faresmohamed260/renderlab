import { Skeleton } from "@/components/ui/skeleton";
import { CreateLoading } from "@/features/create/create-loading";
import styles from "./route-loading.module.css";

type Surface = "create" | "activity";

/** A content boundary, not a generation status. Keep existing route chrome outside. */
export function RouteLoading({ surface }: { surface: Surface }) {
  if (surface === "create") return <CreateLoading />;

  return (
    <section data-route-loading={surface} className={styles.activity} aria-label="Loading content">
      <p role="status" className={styles.status}>Loading content…</p>
      <div className={styles.activityContent} aria-hidden="true">
        <Skeleton className={styles.title} />
        <Skeleton className={styles.line} />
        <div className={styles.activityGrid}>
          {[0, 1, 2].map(index => <Skeleton key={index} className={styles.card} />)}
        </div>
        {[0, 1, 2, 3].map(index => <Skeleton key={index} className={styles.row} />)}
      </div>
    </section>
  );
}
