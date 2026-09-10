# Brand Identity R&D 0.1

**Status:** EXPLORATORY — not approved for production use  
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

## Territory A — Aperture / Portal

### Core idea
A compact geometric aperture whose negative space feels like an image boundary being opened, resized, or passed through. The silhouette should read as one object rather than four generic crop corners.

### Shape hypothesis
Use two interlocking frame planes or a single folded frame path that creates an asymmetric central opening. One edge can appear to pass behind another, giving a subtle spatial cue in static form.

### Why it fits
- `Render` naturally relates to a framed output/view.
- The opening can represent the transition from intent to visible media.
- The same geometry can drive masking/reveal motion on Landing without requiring the static logo to animate.

### Wordmark direction
A clean custom-feeling grotesk relationship, with one small bespoke cut/notch inspired by the aperture geometry rather than a decorative futuristic font.

### Motion extension
The frame begins slightly misregistered, planes align, and the opening resolves. Reduced-motion/static state is simply the resolved mark.

### Main risk
Becoming a camera focus/crop icon. Reject any candidate that looks like a stock viewfinder.

### Palette hypothesis
Near-black / warm-white base with a sharp spectral accent used in small amounts. Test electric mineral green or hot coral alongside the existing violet family; do not decide by trend.

## Territory B — Fold / Material

### Core idea
A single visual material appears folded, cut, or passed through itself. The identity feels constructed from a physical surface rather than drawn as a letter.

### Shape hypothesis
Two broad planes create one compact asymmetric object with a strong outer silhouette and one internal seam/void. At large scale it may show depth; at 16–24px it collapses to a simple two-tone or monochrome shape.

### Why it fits
- Directly expresses transformation and spatiality.
- Gives the brand a tactile behavior that can recur in cards, reveals, transitions, and marketing graphics.
- Avoids the obvious `R = RenderLab` solution.

### Wordmark direction
Tight, editorial sans with slightly compressed spacing and a strong baseline. The mark should provide the unusual character; the wordmark should stay legible and calm.

### Motion extension
One plane folds through another and settles with a short weighted snap. No perpetual rotation or floating 3D logo.

### Main risk
Looking like crypto, Autodesk-style 3D software, origami, or a generic folded ribbon. The final shape needs an unmistakable silhouette, not merely depth shading.

### Palette hypothesis
Graphite / bone neutrals with one saturated physical accent such as vermilion, acid chartreuse, or cobalt used as a material edge—not a full-screen neon wash.

## Territory C — Path / Continuity

### Core idea
A single path visibly changes direction and continues, representing creation → result → reuse rather than a one-shot generation event.

### Shape hypothesis
A continuous broad stroke with two deliberate directional changes and one controlled gap/overlap. It should form a compact symbol without resolving into an infinity sign, waveform, chain link, or obvious letter.

### Why it fits
- Connects strongly to RenderLab's durable-media and continuation model.
- Naturally supports motion from origin to settled mark.
- Can become a compositional device connecting media and states across Landing or product without plastering the logo everywhere.

### Wordmark direction
Open, precise sans with a custom terminal or crossbar echoing the path's directional cut.

### Motion extension
The path traces only once during an intentional brand reveal, then becomes static. Product UI should use the continuity principle—not repeated logo-drawing animations.

### Main risk
Generic SaaS loop/infinity/waveform territory. Reject any symbol whose concept could equally describe syncing, networking, or fintech.

### Palette hypothesis
Mostly monochrome with a single luminous transition along the path for high-expression contexts; static/transactional contexts remain one-color.

## Comparative criteria for first visual pass
Score the first serious concepts on:
1. ownable silhouette at 16–24px;
2. recognizability without color/effects;
3. conceptual fit to RenderLab rather than generic AI;
4. wordmark relationship;
5. ability to extend into motion/material without needing motion to work;
6. compatibility with dark product UI and light email context;
7. ability to coexist with arbitrary colorful user media;
8. risk of category cliché;
9. potential to become a broader compositional language for Landing and product transitions.

No winner should be selected from a large hero logo alone.

## First-pass context board requirements
Each territory's first serious board should show:
- large primary mark;
- monochrome black/white forms;
- 16px / 24px / 32px / 64px tests;
- mark + `RenderLab` lockup concept;
- dark application-rail placement;
- light email-header placement;
- Landing masthead placement near representative media;
- square favicon/app-icon crop;
- small OG/social lockup;
- one still frame describing the optional motion principle.

## Decision state
No territory is preferred or approved yet. The next review step is visual: compare materially different first-pass boards, reject weak/cliché directions, then deepen the strongest one or two before any production implementation.