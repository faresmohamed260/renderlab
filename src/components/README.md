# Component Index

Fast lookup table for humans and AI agents. Populate from the real repository.

| Need | Current component | Source | Status |
|---|---|---|---|
| Application shell / navigation | `AppShell` | `src/components/shell/app-shell.tsx` | APPROVED |
| Generic disclosure / expand-collapse | `Collapsible` | `src/components/ui/collapsible.tsx` (`@radix-ui/react-collapsible`) | APPROVED |
| Create workspace | `CreateWorkspace` | `src/features/create/create-workspace.tsx` | EXPERIMENTAL |
| Create Advanced settings group | `CreateAdvancedPanel` | `src/features/create/create-advanced-panel.tsx` | EXPERIMENTAL |
| Prompt input | Feature-owned textarea in `CreateWorkspace` | Create feature | EXPERIMENTAL |
| Reference media input/context | Feature-owned composition in `CreateWorkspace` | Create feature | EXPERIMENTAL |
| Persisted image/video preview | Feature-owned result composition in `CreateWorkspace` | Create feature + media product API | EXPERIMENTAL |
| Result continuation actions | Capability-derived composition in `CreateWorkspace` | Create feature | EXPERIMENTAL |
| Job progress/status | Create runtime status in `CreateWorkspace`; Activity surface still planned | Create/Activity | EXPERIMENTAL |
| Temporary route placeholder | `RoutePlaceholder` | `src/components/shell/route-placeholder.tsx` | EXPERIMENTAL |
| Generic Button primitive | Not adopted yet | approved source policy | NOT IMPLEMENTED |
| Dialog | Not adopted yet | approved source policy | NOT IMPLEMENTED |
| Dropdown/menu | Not adopted yet | approved source policy | NOT IMPLEMENTED |
| Model selection | Not designed as a default Create control | capability/product decision | NOT IMPLEMENTED |
| Media viewer | Not designed yet | Media feature | NOT IMPLEMENTED |

Before creating reusable UI, check this index and `docs/ui/COMPONENT_CATALOG.md`. Update both when components become approved, locked, or deprecated.

Feature-owned HTML controls are acceptable product composition; generic interaction mechanics should still follow the repository sourcing order. `Collapsible` is the first normalized Radix primitive adopted into `src/components/ui`.

Do not treat `RoutePlaceholder` as a final empty-state primitive; it exists only to validate the Phase 2 shell boundary.
