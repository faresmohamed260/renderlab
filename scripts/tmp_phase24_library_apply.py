from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing replacement marker: {label}")
    return text.replace(old, new, 1)


# Library server surface: keep URL/server ownership, pass discovery slots into the
# existing client selection boundary so selection can transform the same rail.
view_path = Path("src/features/library/library-view.tsx")
view = view_path.read_text(encoding="utf-8")
view = replace_once(
    view,
    'import { ArrowLeft, ArrowRight, FolderOpen, ImageIcon, Search, Star, Video } from "lucide-react";',
    'import { ArrowLeft, ArrowRight, FolderOpen, ImageIcon, Search, Star, Video, X } from "lucide-react";',
    "LibraryView lucide import",
)
view = replace_once(
    view,
    'import { LibraryUploadButton } from "@/features/library/library-upload-button";\n',
    'import { LibraryUploadButton } from "@/features/library/library-upload-button";\nimport styles from "@/features/library/library-gallery.module.css";\n',
    "LibraryView gallery styles import",
)
marker = '''  const batchSelectionKey = [
    tab,
    kind,
    sort,
    searchQuery ?? "",
    favoriteOnly ? "favorites" : "all-media",
    selectedCollectionId ?? "",
    String(offset),
  ].join(":");
'''
controls = marker + r'''
  const sourceControls = (
    <nav className={styles.sourceSwitch} aria-label="Library sections">
      {tabs.map((section) => {
        const active = tab === section.value;
        return (
          <Button key={section.value} asChild variant={active ? "secondary" : "ghost"} size="sm">
            <LibraryNavigationLink
              href={libraryHref(section.value, kind, searchQuery, sort, favoriteOnly, selectedCollectionId)}
              aria-current={active ? "page" : undefined}
            >
              {section.label}
            </LibraryNavigationLink>
          </Button>
        );
      })}
    </nav>
  );

  const searchControls = (
    <form action="/library" method="get" role="search" className={styles.searchForm}>
      {tab === "uploads" ? <input type="hidden" name="tab" value="uploads" /> : null}
      {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
      {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
      {favoriteOnly ? <input type="hidden" name="favorite" value="true" /> : null}
      {selectedCollectionId ? <input type="hidden" name="collection" value={selectedCollectionId} /> : null}
      <Button type="submit" variant="ghost" size="icon-lg" className={styles.searchSubmit} aria-label="Search Library">
        <Search aria-hidden="true" size={17} />
      </Button>
      <label className={styles.searchLabel}>
        <span className="sr-only">Search Library</span>
        <Input
          type="search"
          name="q"
          defaultValue={searchQuery ?? ""}
          maxLength={MEDIA_ASSET_SEARCH_MAX_LENGTH}
          placeholder="Search Library"
          className={styles.searchInput}
        />
      </label>
      {searchQuery ? (
        <Button asChild variant="ghost" size="icon-lg" className={styles.clearSearch}>
          <Link
            href={libraryHref(tab, kind, null, sort, favoriteOnly, selectedCollectionId)}
            aria-label="Clear Library search"
          >
            <X aria-hidden="true" size={17} />
          </Link>
        </Button>
      ) : null}
    </form>
  );

  const filterControls = (
    <div className={styles.filterRow} aria-label="Library filters">
      <nav className={styles.kindSwitch} aria-label="Library media type">
        {filters.map((filter) => {
          const active = kind === filter.value;
          return (
            <Button key={filter.value} asChild variant={active ? "secondary" : "ghost"} size="sm">
              <LibraryNavigationLink
                href={libraryHref(tab, filter.value, searchQuery, sort, favoriteOnly, selectedCollectionId)}
                aria-current={active ? "page" : undefined}
              >
                {filter.label}
              </LibraryNavigationLink>
            </Button>
          );
        })}
      </nav>
      <span className={styles.filterDivider} aria-hidden="true" />
      <Button asChild variant={favoriteOnly ? "secondary" : "ghost"} size="sm" className="shrink-0">
        <LibraryNavigationLink href={libraryHref(tab, kind, searchQuery, sort, !favoriteOnly, selectedCollectionId)}>
          <Star aria-hidden="true" data-icon="inline-start" className={favoriteOnly ? "fill-current" : undefined} />
          Favorites
        </LibraryNavigationLink>
      </Button>
      {collectionsAvailable ? (
        <LibraryCollectionMenu
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          allHref={libraryHref(tab, kind, searchQuery, sort, favoriteOnly, null)}
          collectionHrefs={collectionHrefs}
        />
      ) : null}
      <div className={styles.sortWrap}>
        <LibrarySortToggle
          sort={sort}
          newestHref={libraryHref(tab, kind, searchQuery, "newest", favoriteOnly, selectedCollectionId)}
          oldestHref={libraryHref(tab, kind, searchQuery, "oldest", favoriteOnly, selectedCollectionId)}
        />
      </div>
    </div>
  );

  const uploadAction = accountAvailable && uploadAvailable && tab === "uploads"
    ? <LibraryUploadButton />
    : null;

  const staticCommandRail = (
    <div className={styles.commandSurface} data-library-gallery-rail="true" data-selection="off">
      <div className={styles.defaultControls}>
        <div className={styles.sourceCell}>{sourceControls}</div>
        <div className={styles.searchCell}>{searchControls}</div>
        <div className={styles.actionCell}>{uploadAction}</div>
        <div className={styles.filterCell}>{filterControls}</div>
      </div>
    </div>
  );

  const mediaContextLabel = `${sectionTitle.toUpperCase()} / ${sort === "oldest" ? "OLDEST" : "NEWEST"}`;
'''
view = replace_once(view, marker, controls, "LibraryView control slots")
return_start = view.find('  return (\n    <LibraryDropUploadSurface')
if return_start < 0:
    raise SystemExit("LibraryView return marker missing")
new_return = r'''  return (
    <LibraryDropUploadSurface enabled={accountAvailable && uploadAvailable && tab === "uploads"}>
      <section className={`${styles.workspace} mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-8 sm:pb-16 sm:pt-8 lg:px-12 lg:pt-9`}>
        <div className={styles.contextBlock}>
          <p className={styles.eyebrow}>LIBRARY / MEDIA INDEX</p>
          <h2 className={styles.title}>Library</h2>
          <p className={styles.support}>
            Browse, find and organize durable work without putting controls ahead of the work itself.
          </p>
        </div>

        {!accountAvailable ? (
          <Empty className={`${styles.emptyState} min-h-72 rounded-xl border border-dashed border-border bg-surface-1 px-6`}>
            <EmptyHeader>
              <EmptyMedia><ImageIcon aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>Sign in to use Library</EmptyTitle>
              <EmptyDescription>
                Your generated and uploaded media is private to your RenderLab account.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="secondary">
                <Link href="/settings">Open Settings</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            {!available || items.length === 0 ? staticCommandRail : null}

            {!available ? (
              <Alert className={styles.unavailableState} role="status">
                <AlertDescription className="text-text-muted">
                  Library media is not connected in this environment yet.
                </AlertDescription>
              </Alert>
            ) : items.length === 0 ? (
              <Empty className={`${styles.emptyState} min-h-72 rounded-xl border border-dashed border-border bg-surface-1 px-6`}>
                <EmptyHeader>
                  <EmptyMedia>
                    {collectionMissing || selectedCollectionName ? (
                      <FolderOpen aria-hidden="true" />
                    ) : searchQuery ? (
                      <Search aria-hidden="true" />
                    ) : kind === "video" ? (
                      <Video aria-hidden="true" />
                    ) : (
                      <ImageIcon aria-hidden="true" />
                    )}
                  </EmptyMedia>
                  <EmptyTitle>{emptyTitle}</EmptyTitle>
                  <EmptyDescription>{emptyDescription}</EmptyDescription>
                </EmptyHeader>
                {emptyActionHref && emptyActionLabel ? (
                  <EmptyContent>
                    <Button asChild variant="secondary">
                      <Link href={emptyActionHref}>
                        {offset > 0 ? <ArrowLeft aria-hidden="true" data-icon="inline-start" /> : null}
                        {emptyActionLabel}
                        {offset === 0 && !searchQuery && !favoriteOnly && !selectedCollectionName && !collectionMissing ? <ArrowRight aria-hidden="true" data-icon="inline-end" /> : null}
                      </Link>
                    </Button>
                  </EmptyContent>
                ) : null}
              </Empty>
            ) : (
              <>
                <LibraryBatchSelection
                  key={batchSelectionKey}
                  items={items}
                  collections={collections}
                  sourceControls={sourceControls}
                  searchControls={searchControls}
                  filterControls={filterControls}
                  uploadAction={uploadAction}
                  mediaContextLabel={mediaContextLabel}
                  dropHint={tab === "uploads" ? "Drop files anywhere to upload" : null}
                />

                {(offset > 0 || hasMore) ? (
                  <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Library pages">
                    <div>
                      {offset > 0 ? (
                        <Button asChild variant="outline">
                          <Link href={libraryHref(tab, kind, searchQuery, sort, favoriteOnly, selectedCollectionId, Math.max(0, offset - limit))}>
                            <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                            {previousLabel}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                    {hasMore ? (
                      <Button asChild variant="outline">
                        <Link href={libraryHref(tab, kind, searchQuery, sort, favoriteOnly, selectedCollectionId, offset + limit)}>
                          {nextLabel}
                          <ArrowRight aria-hidden="true" data-icon="inline-end" />
                        </Link>
                      </Button>
                    ) : null}
                  </nav>
                ) : null}
              </>
            )}
          </>
        )}
      </section>
    </LibraryDropUploadSurface>
  );
}
'''
view = view[:return_start] + new_return
view_path.write_text(view, encoding="utf-8")


# Client selection/grid boundary: add slot props, media-local pointer response and
# transform the default rail in-place when current-page selection begins.
batch_path = Path("src/features/library/library-batch-selection.tsx")
batch = batch_path.read_text(encoding="utf-8")
batch = replace_once(
    batch,
    'import { useEffect, useId, useState } from "react";\n',
    'import { useEffect, useId, useState } from "react";\nimport type { PointerEvent as ReactPointerEvent, ReactNode } from "react";\n',
    "LibraryBatchSelection React types",
)
batch = replace_once(
    batch,
    'import { Spinner } from "@/components/ui/spinner";\n',
    'import { Spinner } from "@/components/ui/spinner";\nimport styles from "@/features/library/library-gallery.module.css";\n',
    "LibraryBatchSelection gallery styles",
)
old_signature = '''export function LibraryBatchSelection({
  items,
  collections,
}: {
  items: PublicMediaAsset[];
  collections: PublicMediaCollection[];
}) {'''
new_signature = '''export function LibraryBatchSelection({
  items,
  collections,
  sourceControls,
  searchControls,
  filterControls,
  uploadAction,
  mediaContextLabel,
  dropHint,
}: {
  items: PublicMediaAsset[];
  collections: PublicMediaCollection[];
  sourceControls: ReactNode;
  searchControls: ReactNode;
  filterControls: ReactNode;
  uploadAction: ReactNode;
  mediaContextLabel: string;
  dropHint: string | null;
}) {'''
batch = replace_once(batch, old_signature, new_signature, "LibraryBatchSelection slot props")
return_start = batch.find('  return (\n    <>')
if return_start < 0:
    raise SystemExit("LibraryBatchSelection return marker missing")
pointer_helpers = r'''  function updateCardPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    node.style.setProperty("--gallery-rx", `${((0.5 - y) * 2.6).toFixed(2)}deg`);
    node.style.setProperty("--gallery-ry", `${((x - 0.5) * 3.2).toFixed(2)}deg`);
    node.style.setProperty("--gallery-spot-x", `${(x * 100).toFixed(1)}%`);
    node.style.setProperty("--gallery-spot-y", `${(y * 100).toFixed(1)}%`);
    node.dataset.pointer = "active";
  }

  function clearCardPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const node = event.currentTarget;
    node.style.removeProperty("--gallery-rx");
    node.style.removeProperty("--gallery-ry");
    node.style.removeProperty("--gallery-spot-x");
    node.style.removeProperty("--gallery-spot-y");
    delete node.dataset.pointer;
  }

'''
new_batch_return = r'''  return (
    <>
      <div
        className={styles.commandSurface}
        data-library-gallery-rail="true"
        data-selection={selectionMode ? "on" : "off"}
      >
        <div
          className={styles.defaultControls}
          data-library-default-controls="true"
          aria-hidden={selectionMode ? "true" : undefined}
        >
          <div className={styles.sourceCell}>{sourceControls}</div>
          <div className={styles.searchCell}>{searchControls}</div>
          <div className={styles.actionCell}>
            {uploadAction}
            <Button type="button" variant="ghost" size="sm" onClick={enterSelectionMode}>
              <CheckSquare2 aria-hidden="true" data-icon="inline-start" />
              Select
            </Button>
          </div>
          <div className={styles.filterCell}>{filterControls}</div>
        </div>

        <Collapsible
          open={organizeOpen}
          onOpenChange={(open) => {
            if (busy || !selectionMode) return;
            setOrganizationError(null);
            setOrganizeOpen(open);
          }}
          className={styles.selectionMode}
          data-library-selection-mode="true"
          aria-busy={busy}
          aria-hidden={selectionMode ? undefined : "true"}
        >
          <div className={styles.selectionMain}>
            <div className={styles.selectionSummary}>
              <span className={styles.selectionEyebrow}>SELECTION</span>
              <strong role="status" aria-live="polite">
                {selectedCount === 0 ? "Select media on this page" : `${selectedCount} selected on this page`}
              </strong>
              <small>{itemCountLabel(visibleItems.length)} visible</small>
            </div>

            <div className={styles.selectionActions}>
              <Button type="button" variant="ghost" size="sm" onClick={togglePageSelection} disabled={busy}>
                <CheckSquare2 aria-hidden="true" data-icon="inline-start" />
                {allSelected ? "Clear page" : `Select page (${visibleItems.length})`}
              </Button>
              <CollapsibleTrigger asChild>
                <Button type="button" variant={organizeOpen ? "secondary" : "ghost"} size="sm" disabled={selectedCount === 0 || busy}>
                  <FolderOpen aria-hidden="true" data-icon="inline-start" />
                  Organize
                </Button>
              </CollapsibleTrigger>
              <AlertDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  if (busy) return;
                  setDeleteError(null);
                  setDialogOpen(open);
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" disabled={selectedCount === 0 || busy}>
                    <Trash2 aria-hidden="true" data-icon="inline-start" />
                    Delete {selectedCount || ""}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete {selectedCount} selected {selectedCount === 1 ? "item" : "items"}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the selected media from your Library and collections. Completed deletions are not rolled back if another selected item cannot be deleted. Existing generation history remains.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError ? <p role="alert" className="mt-3 text-sm text-danger">{deleteError}</p> : null}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleting}
                      onClick={(event) => {
                        event.preventDefault();
                        void deleteSelected();
                      }}
                    >
                      {deleting ? <Spinner data-icon="inline-start" /> : <Trash2 aria-hidden="true" data-icon="inline-start" />}
                      {deleting ? "Deleting…" : `Delete ${selectedCount} permanently`}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="button" variant="ghost" size="sm" onClick={cancelSelection} disabled={busy}>
                <X aria-hidden="true" data-icon="inline-start" />
                Cancel
              </Button>
            </div>
          </div>

          <CollapsibleContent className={styles.organizeContent}>
            <div className={`${styles.organizeDeck} grid gap-4 md:grid-cols-2`}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">Favorites</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">Set one explicit Favorite state for every selected item.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void setSelectedFavorite(true)}>
                    {organizingAction === "favorite" ? <Spinner data-icon="inline-start" /> : <Star aria-hidden="true" data-icon="inline-start" />}
                    Favorite selected
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void setSelectedFavorite(false)}>
                    {organizingAction === "unfavorite" ? <Spinner data-icon="inline-start" /> : <Star aria-hidden="true" data-icon="inline-start" />}
                    Unfavorite selected
                  </Button>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">Collection</p>
                {collections.length > 0 ? (
                  <>
                    <Field className="mt-2 max-w-sm">
                      <FieldLabel htmlFor={collectionSelectId}>Collection</FieldLabel>
                      <NativeSelect
                        id={collectionSelectId}
                        size="sm"
                        value={organizeCollectionId}
                        onChange={(event) => {
                          setOrganizationError(null);
                          setOrganizeCollectionId(event.target.value);
                        }}
                        disabled={busy}
                      >
                        <NativeSelectOption value="">Choose a collection</NativeSelectOption>
                        {collections.map((collection) => (
                          <NativeSelectOption key={collection.id} value={collection.id}>{collection.name}</NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={!selectedCollection || busy} onClick={() => void setSelectedCollectionMembership(true)}>
                        {organizingAction === "add-collection" ? <Spinner data-icon="inline-start" /> : <Plus aria-hidden="true" data-icon="inline-start" />}
                        Add selected
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={!selectedCollection || busy} onClick={() => void setSelectedCollectionMembership(false)}>
                        {organizingAction === "remove-collection" ? <Spinner data-icon="inline-start" /> : <Minus aria-hidden="true" data-icon="inline-start" />}
                        Remove selected
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs leading-5 text-text-muted">Create a collection from Manage collections above before adding selected media.</p>
                )}
              </div>
              {organizationError ? <p role="alert" className="md:col-span-2 text-sm text-danger">{organizationError}</p> : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {feedback ? (
        <Alert variant={feedback.variant} className={styles.feedback} role="status">
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className={styles.mediaHead} data-library-media-head="true">
        <div className={styles.mediaContext}>
          <span className={styles.mediaEyebrow}>{mediaContextLabel}</span>
          <strong>{selectionMode ? `${selectedCount} of ${visibleItems.length} selected` : itemCountLabel(visibleItems.length)}</strong>
        </div>
        {dropHint ? <p className={styles.dropNote}>{dropHint}</p> : null}
      </div>

      <div className={styles.mediaGrid} data-library-media-grid="true">
        {visibleItems.map((asset) => {
          const title = assetTitle(asset);
          const selected = selectedIds.has(asset.id);
          return (
            <div
              key={asset.id}
              className={styles.cardShell}
              data-selected={selected ? "true" : "false"}
              onPointerMove={updateCardPointer}
              onPointerLeave={clearCardPointer}
            >
              <Link
                href={`/library/${encodeURIComponent(asset.id)}`}
                className={styles.cardLink}
                data-selected={selected ? "true" : "false"}
                aria-label={`Open ${title}`}
              >
                <div className={styles.mediaFrame} data-library-media-frame="true">
                  <MediaPreview asset={asset} />
                </div>
                <div className={styles.mediaMeta} data-library-media-meta="true">
                  <strong title={title}>{title}</strong>
                  <span>{asset.kind}</span>
                  <time dateTime={asset.createdAt}>{createdLabel(asset.createdAt)}</time>
                </div>
              </Link>

              {selectionMode ? (
                <div className={styles.selectionCheckboxWrap}>
                  <Checkbox
                    className="kinetic-selection-checkbox size-11"
                    aria-label={`Select ${title}`}
                    checked={selected}
                    disabled={busy}
                    onCheckedChange={(checked) => toggleSelection(asset.id, checked === true)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
'''
batch = batch[:return_start] + pointer_helpers + new_batch_return
batch_path.write_text(batch, encoding="utf-8")


# Sort stays compact inside the horizontal rail while preserving accessible copy.
sort_path = Path("src/features/library/library-sort-toggle.tsx")
sort_text = sort_path.read_text(encoding="utf-8")
sort_text = replace_once(
    sort_text,
    '    <Button asChild variant="outline" size="sm" className="col-span-2 w-full sm:w-auto">',
    '    <Button asChild variant="ghost" size="sm" className="min-h-11 shrink-0">',
    "Library sort rail geometry",
)
sort_path.write_text(sort_text, encoding="utf-8")


# UI-070 presentation assertions are intentionally superseded by UI-075's
# legible metadata footer; keep the selection geometry and all ordering/owner checks.
history_path = Path("scripts/verify-library-history.mjs")
history = history_path.read_text(encoding="utf-8")
old_history = '''  const olderCard = page.locator(`a[href="/library/${older.id}"]`);
  const cardBox = await olderCard.boundingBox();
  const frameBox = await olderCard.locator(".kinetic-media-frame").boundingBox();
  assert(cardBox && frameBox && Math.abs(cardBox.height - frameBox.height) <= 2.1, `Library media card metadata is still consuming a separate footer row: ${JSON.stringify({ cardBox, frameBox })}`);
  const metadataPosition = await olderCard.locator(".kinetic-media-meta").evaluate((node) => getComputedStyle(node).position);
  assert(metadataPosition === "absolute", `Library media metadata is not integrated over the media frame: ${metadataPosition}`);
'''
new_history = '''  const olderCard = page.locator(`a[href="/library/${older.id}"]`);
  const cardBox = await olderCard.boundingBox();
  const frameBox = await olderCard.locator('[data-library-media-frame="true"]').boundingBox();
  const metadata = olderCard.locator('[data-library-media-meta="true"]');
  const metadataBox = await metadata.boundingBox();
  assert(cardBox && frameBox && metadataBox, "Library Gallery Rail card geometry could not be measured.");
  assert(metadataBox.y >= frameBox.y + frameBox.height - 2, `Library Gallery Rail metadata is not attached below the media frame: ${JSON.stringify({ cardBox, frameBox, metadataBox })}`);
  const titleFontSize = await metadata.locator("strong").evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
  assert(titleFontSize >= 11, `Library Gallery Rail title metadata became decorative microtype: ${titleFontSize}px`);
'''
history = replace_once(history, old_history, new_history, "Library history UI-075 card assertion")
history_path.write_text(history, encoding="utf-8")
