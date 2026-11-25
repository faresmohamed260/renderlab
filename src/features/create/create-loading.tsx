import { Skeleton } from "@/components/ui/skeleton";

export function CreateLoading() {
  return (
    <div className="create-preview-workspace create-preview-loading mx-auto w-full" data-route-loading="create" role="status" aria-label="Loading Create">
      <div className="create-preview-toolbar" aria-hidden="true">
        <div className="create-preview-tools create-preview-loading-toolbar">
          <span className="create-preview-toolbar-trigger"><span />Queue</span>
          <span className="create-preview-toolbar-trigger"><span />Shortcuts</span>
        </div>
      </div>
      <div className="create-preview-grid" aria-hidden="true">
        <div className="create-preview-controls">
          <div className="create-preview-loading-fields">
            <Skeleton className="create-preview-loading-mode" />
            <Skeleton className="create-preview-loading-prompt" />
            <div className="create-preview-loading-references">
              {[0, 1, 2, 3].map(index => <Skeleton key={index} />)}
            </div>
          </div>
          <div className="create-preview-loading-action" />
        </div>
        <div className="create-preview-canvas">
          <div className="create-preview-stage-frame">
            <div className="create-preview-stage-document">
              <Skeleton className="create-preview-stage-surface" />
            </div>
          </div>
        </div>
        <div className="create-preview-history">
          <Skeleton className="create-preview-loading-line" />
          {[0, 1, 2].map(index => (
            <div className="create-preview-loading-history-row" key={index}>
              <Skeleton className="create-preview-loading-thumbnail" />
              <Skeleton className="create-preview-loading-line" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
