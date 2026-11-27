import { Skeleton } from "@/components/ui/skeleton";
import styles from "./library-loading.module.css";

export function LibraryLoading({ showInspectorPreview, showUpload }: {
  showInspectorPreview?: boolean;
  showUpload?: boolean;
}) {
  return (
    <div className={styles.workspace} aria-hidden="true">
      <div className={styles.heading}>
        <Skeleton className={styles.caption} />
        <Skeleton className={styles.title} />
        <Skeleton className={styles.description} />
      </div>

      <div className={styles.layout}>
        <div className={styles.controls}>
          <div className={styles.discovery}>
            <Skeleton className={styles.search} data-library-loading-slot="search" />
            <div className={styles.sources}>
              <Skeleton className={styles.field} />
              <Skeleton className={styles.field} />
            </div>
            <div className={styles.organization}>
              <Skeleton className={styles.field} />
              <Skeleton className={styles.field} />
              <div className={styles.collections}>
                {[0, 1, 2, 3].map((index) => <Skeleton key={index} className={styles.field} />)}
              </div>
            </div>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.galleryTitle}><Skeleton /></div>
            <div className={styles.actions}>
              {showUpload && <Skeleton className={styles.field} />}
              <Skeleton className={styles.field} />
            </div>
            <div className={styles.kinds}>
              {[0, 1, 2].map((index) => <Skeleton key={index} className={styles.kind} />)}
            </div>
            <Skeleton className={styles.sort} />
            <div className={styles.phoneFilters}>
              {[0, 1, 2, 3, 4].map(index => <Skeleton key={index} className={styles.field} />)}
            </div>
            <div className={styles.density}>
              <Skeleton className={styles.icon} />
              <Skeleton className={styles.icon} />
            </div>
          </div>
        </div>

        <div className={styles.gallery}>
          <div className={styles.mediaHeading}>
            <Skeleton className={styles.caption} />
          </div>
          <div className={styles.grid}>
            {Array.from({ length: 12 }, (_, index) => (
              <div key={index} className={styles.card} data-library-loading-slot="card">
                <Skeleton className={styles.frame} data-library-loading-slot="frame" />
                <div className={styles.metadata}>
                  <Skeleton />
                  <Skeleton />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.inspector}>
          {showInspectorPreview && (
            <>
              <Skeleton className={styles.preview} data-library-loading-slot="inspector-preview" />
              <Skeleton className={styles.field} />
              <Skeleton className={styles.summary} />
              <div className={styles.inspectorActions}>
                <Skeleton className={styles.field} />
                <Skeleton className={styles.field} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
