# Frontend Architecture

Document the frontend as it actually exists. Audit first; do not rewrite the application to match this file.

## Framework
**Framework:** TODO  
**Version:** TODO  
**Routing:** TODO  
**Rendering model:** TODO

## Directory Structure
```text
TODO: replace with audited source tree
```

## Styling
**Tailwind:** TODO  
**Global CSS:** TODO  
**CSS modules:** TODO  
**CSS-in-JS:** TODO  
**Design tokens:** TODO  
**shadcn/ui:** TODO  
**Other UI libraries:** TODO

## Component Layers
After audit, classify real components into:
1. UI primitives
2. Shared application components
3. Feature components
4. Screen/page composition

## State Management
**Server state:** TODO  
**Global/client state:** TODO  
**Local state:** TODO  
**Generation/job state:** TODO

## Integrations
Document actual frontend integration with Supabase, Cloudflare R2, ComfyUI, auth, generation APIs, media storage, and other services.

## Generation Flow
```text
UI
  ↓
TODO
  ↓
Generation API/orchestration
  ↓
ComfyUI
  ↓
Storage
  ↓
UI update
```

## Target Direction
Move toward reusable application-specific components, consistent primitives, centralized tokens, minimal duplicate UI, predictable variants, documented ownership, and catalog-first discovery.

This target does not justify an unnecessary rewrite.

## Known Architectural Problems
TODO after audit.

## Migration Constraints
TODO after audit.
