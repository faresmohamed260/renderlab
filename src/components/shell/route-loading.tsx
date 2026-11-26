import { Skeleton } from "@/components/ui/skeleton";
import { CreateLoading } from "@/features/create/create-loading";
import { LibraryLoading } from "@/features/library/library-loading";
import styles from "./route-loading.module.css";

type RouteLoadingProps =
  | { surface: "create" | "activity"; showInspectorPreview?: never; showUpload?: never }
  | { surface: "library"; showInspectorPreview?: boolean; showUpload?: boolean };

/** A content boundary, not a generation status. Keep existing route chrome outside. */
export function RouteLoading({ surface, showInspectorPreview, showUpload }: RouteLoadingProps) {
  if (surface === "create") return <CreateLoading />;
  const library = surface === "library";
  const label = library ? "Loading Library" : "Loading content";
  return (
    <section data-route-loading={surface} className={styles[surface]} aria-label={library ? "Library content" : label}>
      <p role="status" className={styles.status} aria-label={library ? label : undefined}>{label}…</p>
      {surface === "library" && <LibraryLoading showInspectorPreview={showInspectorPreview} showUpload={showUpload} />}
      {surface === "activity" && (
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
