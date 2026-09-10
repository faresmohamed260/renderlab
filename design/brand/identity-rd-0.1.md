# Brand Identity R&D 0.1

**Status:** DIRECTION SELECTED — production vector artwork not yet finalized  
**Base:** `main` at `719ee0973c1796342e25bbddfadbbdec93a9db64`  
**Authority:** `docs/ui/BRAND_SYSTEM.md`, `docs/ui/VISUAL_NORTH_STAR.md`, `docs/ui/DESIGN_WORKFLOW.md`  
**Task:** #151

## Purpose
This is the working design record for the first RenderLab identity exploration. It deliberately precedes any production logo, favicon, Landing, email, font, palette, or application-brand change.

The goal is not to make a nicer `R`. The goal is to find an ownable identity for a futuristic creative instrument: quiet and precise at rest, memorable when it transforms.

## Verified current-state audit

### Primary mark and wordmark
- `src/components/brand/renderlab-brand.tsx` draws a single open line path that reads as an `R`.
- The wordmark is ordinary application typography: `font-semibold tracking-tight` applied to the text `RenderLab`.
- The current mark is technically clean and scales reasonably, but it has little concept beyond the initial letter and no distinctive relationship to rendering, transformation, durable media, continuity, or spatial creation.

### Favicon / app icon
- `src/app/icon.svg` repeats the same line-`R` geometry inside a rounded dark square.
- `public/renderlab-mark.svg` uses the same underlying mark family.
- Current favicon recognition therefore depends almost entirely on the letterform rather than a distinctive silhouette.

### Application shell
- Desktop and mobile shell placements use the same `RenderLabBrand` component.
- The shell already has a kinetic dark/glass treatment with violet/cyan accent energy, but the identity itself does not participate in that language.
- Any replacement must remain legible in the compact rail/topbar sizes and should not compete with Create/Library media.

### Landing
- The current Landing repeats the mark/wordmark in header and footer and uses a dark grid, glass panels, violet/cyan highlights, product copy, feature cards, and a static Create illustration.
- It is coherent and functional but still reads primarily as a polished SaaS composition rather than a brand world built around a distinctive visual idea.
- This R&D does not redesign the Landing; it only tests candidate identities in a masthead context.

### Open Graph / social
- `src/app/opengraph-image.tsx` duplicates the current line-`R` directly in JSX and uses Arial for the social card.
- The card is dark, high-contrast, violet-accented, and product-descriptive, but not yet driven by a distinct identity system.
- A future accepted identity must therefore include a reproducible mark/wordmark treatment that works in server-rendered OG output without depending on browser-only effects.

### Current palette / type baseline
- Product defaults are dark neutrals with violet `#8172F6`, brighter violet `#B2A7FF`, cyan `#73D7FF`, and Inter/system UI typography.
- `BRAND_SYSTEM.md` explicitly reopens the accent palette; these colors are context, not constraints.

### Auth email
Repository production records currently establish:
- Supabase Auth uses Resend custom SMTP;
- invite/recovery mail uses branded token-hash templates;
- click/open tracking is disabled;
- external Gmail invite/recovery acceptance was verified;
- Outlook-specific rendering was not exercised.

The currently available Supabase connector in this session exposes project/database operations but not the live Auth email-template body or SMTP-template configuration. Therefore this audit does **not** invent or claim the current remote email layout. Email context testing in this R&D is a visual mock placement only. Any later live template change still requires a fresh remote configuration audit and real auth-link lifecycle verification.

## Locked product / engineering boundaries
This identity exploration may reopen visual identity only. It does not change:
- the product name `RenderLab`;
- product routes or information architecture;
- invitation-only / closed-beta behavior;
- authentication, token-hash, redirect, ownership, or security semantics;
- Create/Library/Viewer/Activity behavior;
- production dependencies or fonts;
- deployment state.

## Exact reference matrix
References provide principles, not assets to copy.

| RenderLab need | Exact reference | Borrow | Do not copy |
|---|---|---|---|
| Quiet identity that lets generated media lead | Krea Press Kit — `https://www.krea.ai/press` | Strong monochrome identity, restrained neutral palette, product imagery carrying most of the visual emotion | Krea mark, lockup geometry, posters, or exact monochrome composition |
| Mark / wordmark / icon system discipline | Linear Brand Guidelines — `https://linear.app/brand` | Clear distinction between wordmark, logomark, compact icon; generous clearspace; strong monochrome behavior | Linear circle/diagonal motif, exact proportions, blue-gray palette |
| Identity that can become spatial/material on expressive surfaces | Spline Brand Design — `https://spline.design/solutions/brand-design` | Treat a static brand form as something that may gain depth, material, lighting, and interaction in specific contexts | Spline logo, 3D look, materials, or making 3D mandatory for recognition |
| Bespoke immersive expression rather than effect catalog | Lusion — `https://lusion.co/` | One authored visual idea can drive motion, atmosphere, 3D, and composition; interaction should feel tailored to the brand | Any client/project visual, layout, 3D object, or campaign identity |
| Clean light/dark production lockups | Runway attribution assets — `https://docs.dev.runwayml.com/usage/attribution/` | Simple production-safe dark/light logo forms that remain recognizable without effects | Runway wordmark/logo geometry or its brand styling |

### Reference synthesis
The desired combination is not "look like these brands." It is:
- Krea-level media restraint;
- Linear-level identity-system discipline;
- Spline-level potential for physical extension;
- Lusion-level authored motion/world-building;
- Runway-level production-safe simplicity.

The RenderLab mark itself must be original and recognizable without any of those references present.

## First visual pass — rejected
The first generated exploration board tested three broad visual territories: Aperture / Portal, Fold / Material, and Path / Continuity.

The board was rejected because the symbols were visually polished but semantically generic. They could have represented almost any premium technology or AI brand and did not visibly connect to either **Render** or **Lab**.

That rejection adds a permanent identity rule:

> A RenderLab mark must have an explainable conceptual relationship to both rendering and experimentation. Futuristic appearance alone is insufficient.

Avoid solving this literally with a camera, laboratory flask, sparkle, brain, wand, or other category cliché. The relationship should be structural rather than illustrative.

## Territory A — Aperture / Portal

### Core idea
A compact geometric aperture whose negative space feels like an image boundary being opened, resized, or passed through. The silhouette should read as one object rather than four generic crop corners.

### Shape hypothesis
Use two interlocking frame planes or a single folded frame path that creates an asymmetric central opening. One edge can appear to pass behind another, giving a subtle spatial cue in static form.

### Why it fits
- `Render` naturally relates to a framed output/view.
- The opening can represent the transition from intent to visible media.
- The same geometry can drive masking/reveal motion on Landing without requiring the static logo to animate.

### Main risk
Becoming a camera focus/crop icon or generic premium-tech symbol. First-pass exploration did not establish enough connection to `Lab`, so this territory is not selected.

## Territory B — Fold / Material

### Core idea
A single visual material appears folded, cut, or passed through itself. The identity feels constructed from a physical surface rather than drawn as a letter.

### Why it fits
- Directly expresses transformation and spatiality.
- Gives the brand a tactile behavior that can recur in cards, reveals, transitions, and marketing graphics.

### Main risk
Looking like crypto, generic 3D software, origami, or a folded-ribbon technology logo. First-pass exploration did not establish enough connection to either word in `RenderLab`, so this territory is not selected.

## Territory C — Path / Continuity

### Core idea
A single path visibly changes direction and continues, representing creation → result → reuse rather than a one-shot generation event.

### Why it fits
- Connects strongly to RenderLab's durable-media and continuation model.
- Naturally supports motion from origin to settled mark.

### Main risk
Generic SaaS loop/infinity/waveform territory. First-pass exploration did not establish a sufficiently ownable `Render + Lab` story, so this territory is not selected.

## Territory D — Lab Grid / modular R — SELECTED

### Core idea
A bold `R` assembled from a small set of simple modular geometric units. The pieces read simultaneously as **pixels / image tiles / render blocks** and **experiment cells / samples / a controlled lab grid**.

The concept therefore connects directly to the product name rather than merely looking futuristic:
- **Render:** visual results are built from discrete image-like units into a resolved whole.
- **Lab:** those same units suggest controlled experimentation, variants, samples, iteration, and recombination.

The mark remains recognizably `R` at a glance, preserving a direct connection to the RenderLab name, while its construction gives the letter an ownable reason to exist.

### Selected visual behavior
The selected exploration uses a strong geometric outer silhouette rather than a thin line monogram. It should feel modular and constructed, with a combination of rectilinear cells and one or more curved/quadrant forms sufficient to resolve the `R`.

The production redraw should seek the **fewest pieces necessary** to preserve the idea. Tiny internal details are a liability at favicon size.

### Wordmark relationship
Use a calm, precise sans-serif wordmark so the mark carries most of the unusual character. `RenderLab` should remain highly legible and should not be distorted into a futuristic display font.

The exact wordmark spacing, weight and any bespoke letter adjustments remain open until the production mark geometry is finalized.

### Motion identity
The modular construction creates a natural future motion idea: cells can appear as separate experiment/render units and then resolve into the finished `R`.

This should be used selectively—for example in a Landing brand reveal—not loop continuously throughout the application. Reduced-motion and static contexts use the resolved mark only.

### Color direction
The accepted board used blue/violet/pink luminous treatment successfully as an exploration cue, but **the exact gradient is not locked**.

The mark must first work in pure monochrome. Color can then add depth or state on high-expression surfaces. The final palette must coexist with arbitrary colorful user media and avoid collapsing back into generic “purple AI app” styling.

### Why selected
The user explicitly approved this direction and specifically called out the `R` logo as good. It is the first explored mark that combines:
- immediate name recognition;
- an understandable `Render + Lab` concept;
- strong compact silhouette potential;
- modularity that can extend into a broader visual system;
- a natural but optional motion language;
- compatibility with product, Landing, email, favicon and social contexts.

## Production-vector acceptance requirements
The selected concept is approved; the generated exploration artwork is **not** a vector master and must not be shipped literally.

Before replacing production identity assets, create and review precise owned vector geometry with:
- 16px / 24px / 32px / 64px / large-display tests;
- pure monochrome black and white versions;
- dark/light background versions;
- mark-only and mark + `RenderLab` lockups;
- favicon/app-icon crop;
- dark application-rail placement;
- light email-header placement;
- Landing masthead placement near representative media;
- Open Graph/social placement;
- optical balance, clearspace and alignment rules;
- static/reduced-motion equivalent for any animated reveal.

Reject any final construction that needs gradient, glow, blur or animation in order to read as the intended `R`.

## Comparative criteria carried forward
The production redraw should be judged on:
1. ownable silhouette at 16–24px;
2. recognizability without color/effects;
3. clear conceptual fit to RenderLab rather than generic AI;
4. wordmark relationship;
5. ability to extend into motion/material without needing motion to work;
6. compatibility with dark product UI and light email context;
7. ability to coexist with arbitrary colorful user media;
8. low category-cliché risk;
9. potential to become a broader compositional language for Landing and product transitions.

## Decision state
**Selected identity direction:** Lab Grid / modular `R`.

The user explicitly approved the second-pass brand board and specifically approved the `R` mark. This closes the “choose a concept” portion of Brand Identity R&D 0.1.

Still open before production implementation:
- exact owned vector construction;
- small-size optical tuning;
- final monochrome/inverted masters;
- wordmark lockup tuning;
- palette decision;
- optional motion prototype and reduced-motion equivalent;
- final cross-surface pressure tests.

The generated Landing, email and product mockups are **directional context only**, not accepted replacement layouts. No production logo asset, favicon, shell component, Landing code, email template, dependency, backend, schema, infrastructure or deployment state has changed.