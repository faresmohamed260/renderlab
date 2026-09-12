# Activity Lifecycle Register v0.1 — Phase 26 R&D

**Status:** EXPERIMENTAL / DESIGN STUDY — NOT APPROVED  
**Tracker:** issue #202  
**Branch:** `rd/activity-lifecycle-register-v01`  
**Authoritative starting main:** `639e84b5198a7b566eb18b3d34cf52b327249fc4`  
**Production boundary:** R&D only. This does not authorize production `/activity` changes, an implementation contract, new capability, backend/schema/infrastructure work, merge of prototype code to `main`, or deployment.

## Why this slice exists

Landing, Create, Library and Media Viewer now share the approved Lab Grid / Clear Composer / Gallery Rail / Media Register family. Activity still carries the earlier Phase 22 Kinetic Precision composition: rounded lifecycle cards, status pills, active-row scan/glow and a separate live-refresh notice. Its behavior is mature, but its visual topology predates the accepted redesign family.

Phase 26 therefore reopens **presentation only**. Activity remains private generation-job history/control. It is not a queue monitor, worker console, provider dashboard or Admin substitute.

## Current implementation audit

### Route and ownership

`/activity` is an application-shell route. The page resolves the current RenderLab account, normalizes the requested page, loads the owner-scoped Activity snapshot server-side and renders `ActivityView`. The UI-074 compact horizontal application header is the current shell authority on desktop and narrow layouts; the historical Phase 22 desktop rail/mobile dock geometry is obsolete.

### Dataset and pagination

The current feed is real account-private generation jobs, newest first, bounded to at most 20 rows per page and paginated through ordinary query state. It refreshes only while `snapshot.hasNonterminal` is true, using the current five-second observational refresh without inventing finer progress. A succeeded job whose durable result has been deleted is intentionally omitted rather than displayed as a phantom success.

### Truthful lifecycle states

The current product states are exactly `queued`, `preparing`, `running`, `cancelling`, `persisting`, `succeeded`, `failed` and `cancelled`. No concept may add queue position, percentage, ETA, SLA, provider stages or inferred intermediate execution stages.

### Current actions

- **View result** appears only when the owner-scoped durable result is present.
- **Run Again** is successful prompt-generation history only, after current server revalidation. It is iteration, not recovery.
- **Retry** is eligible failed jobs only. It creates a distinct current-revalidated attempt and randomizes the failed prompt-generation seed under the current correction contract. It is recovery, not replay.
- **Cancel** is eligible active jobs only. Confirmation and the cancellation-safe lifecycle remain distinct from Retry/Run Again.

The browser never owns job truth. Action success refreshes the server-owned dataset.

### Failure presentation

Failure details are sanitized product guidance. Provider, worker, workflow, storage and failover identity remain hidden. R&D may change placement/hierarchy of the message, not its trust boundary.

### Loading and empty states

The redesigned surface must explicitly handle route/loading placeholder without fake progress, empty history, full history with no active work, mixed active + terminal history and pagination boundaries.

## Locked behavior vs reopened presentation

### Locked

- `/activity` route and account-private ownership;
- newest-first order and bounded pagination;
- all eight real statuses;
- server ownership of history and action eligibility;
- polling only while nonterminal jobs exist;
- owner-scoped result navigation;
- sanitized failure guidance;
- deleted-output success suppression;
- distinct Retry / Run Again / Cancel semantics;
- current cancellation confirmation/lifecycle safety;
- no provider/worker/storage/workflow identity in ordinary Activity;
- no fake progress, ETA, queue position or SLA;
- maintained production primitive boundary;
- keyboard, focus, touch and reduced-motion obligations.

### Reopened for R&D

- page hierarchy and density;
- row/card topology;
- status placement and visual weight;
- where active refresh state is communicated;
- action grouping and result-link hierarchy;
- local failure-message placement;
- temporal choreography when a real status changes;
- how terminal history visually settles;
- responsive folding at ~390px;
- empty/loading composition.

## Design inheritance — non-negotiable

Activity is a **2/4 expressiveness** surface. Carry forward the locked Lab Grid identity, UI-074 compact horizontal header, Landing's editorial hierarchy and cool/warm atmosphere, Clear Composer density/control discipline, Gallery Rail technical cadence and spatial registration, Media Register attached-information logic, technical microtype, obvious controls and state-first hierarchy. Motion is bounded and meaningful only where real lifecycle changes justify it; touch has static equivalents and `prefers-reduced-motion` has complete equivalents.

Do not introduce neon/glass styling, a generic admin table, provider-console conventions, progress bars, fake telemetry, hover-only actions or a competing navigation system.

## Interaction reference matrix — grammar only

| Reference | Useful grammar | Do not copy |
|---|---|---|
| GitHub Actions workflow runs | Explicit queued/in-progress/completed/cancelled semantics; Cancel exists only while work is active; rerun is a deliberate separate operation. | Repository/CI taxonomy, logs, check icons or developer-console density. |
| Linear activity/history patterns | Restrained chronological scanning, compact state-change language, immediate unobtrusive feedback and details only when applicable. | Issue-management visual skin, avatars, project taxonomy or notification conventions. |
| Deployment-history interfaces | Current state can carry stronger emphasis while completed history visually recedes without disappearing; status stays legible without percentage progress. | Deployment/provider terminology, build metadata, branch/commit controls or operational metrics. |

### Derived Activity principles

1. A job is a **registered history object**, not a dashboard card.
2. Real state is readable before decoration; motion may emphasize change but never quantify progress.
3. Active work may carry bounded energy; terminal rows should settle and recede.
4. Recovery/iteration/lifecycle controls must look related but remain semantically distinct.
5. Failure guidance belongs to the failed job, not a global alarm system.
6. Narrow layouts should preserve chronological scanning rather than turn every row into a tall settings card.
7. Live-refresh presence should be quiet and contextual, not a persistent banner competing with the feed.

## Three same-family concepts

All concepts preserve the same data/order/actions. They differ in information topology and state choreography, not theme.

### Concept A — Lifecycle Register

**Thesis:** Activity becomes the history counterpart to Gallery Rail and Media Register: a precise registered stack of jobs, separated by rules rather than floating cards.

Desktop uses one horizontal register strip per job with four zones: time, state, job summary and actions. A narrow leading lifecycle rail anchors every row to the Lab Matrix. Active rows receive a bounded marker pulse in that rail, never a filling bar. Terminal rows retain full legibility but settle into lower-contrast rules. Failed guidance opens directly beneath its job summary. Actions stay conventional and stationary.

At ~390px, the same strip folds into two bands rather than becoming a generic card: state + time share the top band, summary occupies the middle and actions use a full-width lower register with >=44px touch targets. The lifecycle rail remains visible.

State change stays local to the status label and rail marker. A terminal transition receives one short settling wash and then becomes still. Cancel confirmation expands locally; confirming changes the truthful state to `Cancelling`, and final `Cancelled` settles in place. Reduced motion swaps directly to the settled state.

**Strength:** strongest continuity with Gallery Rail/Media Register; efficient history scanning; naturally avoids an operations-console feel.  
**Risk:** can become too sparse if summary/action spacing is not carefully balanced.

### Concept B — State Ledger

**Thesis:** Treat Activity as an editorial ledger: chronology and state form a disciplined data rhythm, with almost no decorative container chrome.

A date/time measure, compact technical state cell, primary summary column and right action receipt create the desktop cadence. Hairline rules and occasional date separators provide hierarchy. Active rows receive a single registration notch. Errors occupy an indented ledger note beneath the failed entry. Narrow layout removes column headers and turns each entry into a labelled definition grid while keeping newest-first chronology intact.

**Strength:** fastest scanning and lowest visual noise.  
**Risk:** closest to an admin/data table; needs strong editorial spacing to stay recognizably RenderLab.

### Concept C — Event Fold

**Thesis:** Each job is a chronological event on a vertical registration spine; details/actions fold from the event rather than sitting in a full-width card.

A vertical Lab Matrix spine anchors status markers and timestamps. Summary blocks hang from the spine with more breathing room than the Register. Actions sit in a short attached lower fold; failure guidance becomes a secondary attached fold. Active events have bounded marker energy while older terminal events settle back. On narrow screens the spine persists and content fills the remaining width.

**Strength:** most authored/editorial direction and gives real state changes a natural spatial origin.  
**Risk:** consumes more vertical space and may over-express a surface that should stay 2/4.

## v0.1 recommendation

Prototype all three, but carry **Lifecycle Register** deepest first. It has the clearest inheritance path: Gallery Rail establishes registered chronological/media scanning, and Media Register establishes attached contextual information. Activity can extend that grammar into state/history without pretending a job is media, without adding a dashboard-card system and without raising expressiveness above 2/4.

State Ledger remains the density pressure-test. Event Fold remains the editorial/motion pressure-test.

## Choreography hypotheses for Lifecycle Register

### Nonterminal presence

Origin is the server-owned row status. Expression is a small leading marker pulse plus quiet `LIVE` context in the page register. Forbidden: translating marker position as percentage, growing a bar, cycling fabricated stages or showing elapsed time as progress.

### Real status change

The status label and lifecycle rail change locally over roughly 180–260ms while the row stays spatially registered. The new truthful status becomes stationary. Reduced motion performs immediate text/marker replacement.

### Terminal settle

A real transition into `succeeded`, `failed` or `cancelled` receives one bounded 260–420ms wash/contrast settle. After that there is no perpetual animation; terminal history recedes slightly but remains legible. Reduced motion applies terminal styling immediately.

### Cancel

Cancel opens a local confirmation fold. Confirming locks conflicting actions and only advances the row as product state changes to `Cancelling`. `Cancelled` uses the same row geometry; no removal or reordering is implied. Reduced motion uses no transforms.

### Retry / Run Again

Both remain ordinary buttons. In-flight feedback is local. Accepted requests produce distinct jobs through existing server behavior; the historical row must never animate into the new job or imply mutation of the previous attempt.

## Prototype requirements

The isolated prototype must demonstrate the current-family UI-074 header context; all three concept topologies; Lifecycle Register at desktop and 390px; loading and empty; all eight lifecycle states; View result, Run Again, Retry and Cancel; local sanitized failure guidance; Cancel confirmation → cancelling → cancelled continuity; running → succeeded terminal settling without fake progress; keyboard focus; >=44px touch targets; no body horizontal overflow; reduced-motion equivalents; and no dependency on provider/worker/admin metadata.

The prototype uses synthetic representative job content only. It is not product state and does not authorize new data fields.

## Acceptance gate

Automation makes the direction reviewable; it does not approve it.

- [x] Current source/product contracts audited.
- [x] Phase 26 tracker opened as #202.
- [x] Locked behavior separated from reopened presentation.
- [x] Interaction-reference matrix recorded.
- [x] Three materially different same-family concepts defined.
- [ ] Repository-backed interactive prototype captured at desktop and 390px.
- [ ] All lifecycle/action/error/loading/empty states evidenced.
- [ ] Keyboard/touch/no-overflow/reduced-motion evidence passed.
- [ ] Temporal running→terminal and cancellation evidence captured.
- [ ] Human visual critique completed.
- [ ] User explicitly approves a complete Activity direction.

Only after explicit approval may a separate implementation decision/contract be proposed before production Activity code changes.