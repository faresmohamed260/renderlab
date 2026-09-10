# RenderLab Brand System Direction

**Status:** `LOCKED` visual identity reference; production implementation pending  
**Scope:** brand identity, logo/wordmark, brand expression across Landing, product surfaces, transactional/auth email, and public metadata  
**Does not authorize:** production asset replacement, product behavior changes, backend/schema/infrastructure changes, dependency adoption, live Auth-template changes, production deployment, or a new product Cycle/Phase by itself

## Purpose
RenderLab must feel like one coherent premium creative brand across the product, public site, identity, and communication surfaces. The brand cannot be treated as a logo placed on top of an otherwise generic AI application.

This document records the user-approved direction for the visual program. It works with `VISUAL_NORTH_STAR.md`, `UI_SYSTEM.md`, and `DESIGN_WORKFLOW.md`.

The central idea is:

> RenderLab should feel less like a website containing AI tools and more like a futuristic creative instrument whose interface has space, weight, continuity, and personality.

The public expression, product expression, and communication expression should all feel like different intensities of that same instrument.

## Brand thesis
RenderLab is a place where creative intent becomes durable visual work.

The brand should communicate:
- **creative capability without technical intimidation;**
- **precision without sterility;**
- **future-facing technology without generic AI clichés;**
- **physicality without gimmickry;**
- **confidence without hype;**
- **visual ambition without overwhelming the user's own media.**

At rest, RenderLab should feel calm, spacious, controlled, and deliberate. During meaningful interaction, it should become tactile, spatial, responsive, and memorable.

A useful shorthand for the approved direction is:

**Krea-like simplicity + Runway-like creative focus + Spline/Lusion-like physicality + Linear-like precision — resolved into an original RenderLab identity rather than copied from any of them.**

These are directional anchors, not templates and not permission to copy another brand's marks, layouts, assets, or proprietary identity.

## Brand personality
The intended personality is:
- **authored** — choices should feel designed rather than library-default;
- **cinematic** — composition and movement can carry atmosphere where the surface allows it;
- **tactile** — important objects and controls can feel manipulable and weighted;
- **editorial** — typography, spacing, hierarchy, and restraint should feel considered;
- **precise** — visual expression never makes function ambiguous;
- **curious** — the product should invite interaction and discovery;
- **confident** — avoid breathless AI-superlative language and visual noise;
- **media-first** — user and generated work remains the visual hero.

The emotional rule is:

> **Restrained when nothing is happening; remarkable when something happens.**

## What RenderLab should not look like
Avoid converging on familiar "AI startup" shorthand as the primary identity:
- a purple gradient blob as the brand;
- sparkle/star symbols used only to mean "AI";
- brains, neural-network nodes, circuit traces, robot imagery, or magic-wand clichés;
- an arbitrary glowing orb with no relationship to the product;
- glassmorphism applied to every surface;
- a generic lettermark with no ownable idea;
- excessive neon or bloom that competes with media;
- every interaction using the same fade, scale, or hover glow;
- marketing copy built around vague claims such as "unleash creativity" or "AI magic" without product substance.

The existing simple line-drawn `R` remains the production mark until the locked replacement identity is faithfully productionized and passes the implementation and validation gates below.

## Identity system goals
The identity must work before motion or special effects are added.

A successful RenderLab identity includes:
1. **Primary mark** — recognizable at small application/favicon sizes and distinctive at large marketing sizes.
2. **Wordmark relationship** — a deliberate relationship between the mark and `RenderLab`, not merely an icon beside ordinary UI text.
3. **Monochrome form** — recognizable in one color on light and dark backgrounds.
4. **Compact form** — suitable for favicon, app icon, narrow rail, avatar-like placement, and small email header use.
5. **Full brand lockup** — suitable for Landing, email, public metadata, documentation, and larger brand moments.
6. **Optional motion identity** — an animated reveal/morph may extend the mark on expressive surfaces, but the static identity stands on its own.

The selected direction is an `R` monogram because its modular construction gives the letter a direct and ownable `Render + Lab` concept. A generic letterform remains insufficient.

## Initial logo exploration territories
The first identity R&D pass deliberately explored materially different concepts. They were starting territories rather than preselected answers.

### Territory A — Frame / Portal
Explore an identity based on a frame, aperture, boundary, or portal through which an idea becomes an image or one visual state becomes another.

Potential strengths:
- naturally connects to rendering and visual composition;
- can support masking/morphing motion;
- can frame media without turning the logo into a literal picture icon.

Risk to avoid:
- generic crop-frame or camera-viewfinder symbolism.

### Territory B — Material / Fold
Explore an identity that feels like a surface, layer, sheet, fold, cut, or spatial material being transformed.

Potential strengths:
- expresses physicality and transformation;
- can create a distinctive silhouette and dimensional motion language;
- relates to RenderLab's spatial/tactile interface ambitions.

Risk to avoid:
- looking like a generic 3D software, origami, or crypto mark.

### Territory C — Signal / Continuity
Explore a continuous stroke, path, loop, or evolving shape that suggests an idea moving through creation, refinement, and continuation.

Potential strengths:
- connects directly to the product's durable creative thread;
- supports elegant motion without requiring spectacle;
- may allow subtle integration of `R` geometry without being a conventional monogram.

Risk to avoid:
- infinity-symbol, waveform, or generic SaaS-loop clichés.

### Selected and locked direction — Lab Grid / modular R
The first broad concept board was rejected because its symbols were visually polished but too generic and did not communicate either half of the name strongly enough.

The second-pass Lab Grid direction established a bold `R` constructed from simple modular geometric units. The units read simultaneously as:
- **render blocks / pixels / image tiles** assembling into a resolved visual result; and
- **lab cells / samples / experiment modules** suggesting iteration, testing, recombination, and controlled creative exploration.

A later monochrome reconstruction drifted from the selected artwork and was explicitly rejected by the user. The corrected/refined board then restored the intended four-module `R`, clean wordmark, and dark/light lockups. The user explicitly approved that corrected result and instructed that it be locked.

The exact visual identity is now controlled by:
- `design/brand/identity-lock-2026-09-10.md` — binding geometry, wordmark, color, fidelity and change-control rules;
- `design/brand/lab-grid-approved-lockup-2026-09-10.webp` — repository-preserved approved visual reference;
- `design/brand/approval-2026-09-10.md` — human approval record.

The earlier `design/brand/lab-grid-r-mark-v0.1.svg` and `design/brand/lab-grid-r-pressure-test-v0.1.svg` are **rejected/superseded R&D artifacts** and must not be used as production geometry sources.

### Locked mark characteristics
The approved modular `R` uses the same visual relationship shown in the canonical reference:
- separated upper-left horizontal rectangular module;
- upper-right rounded/bowl module;
- separated lower-left square module;
- separated lower-right curved/quarter-form leg module;
- deliberate negative-space gaps between the four major modules;
- compact upright `R` silhouette.

Production vectorization is a mechanical fidelity task, not a new logo-design exercise. Do not redraw, simplify, add modules, change the bowl/leg, or alter the proportions from memory.

## Logo implementation acceptance requirements
Before the locked identity can replace production assets, review its faithful implementation in real usage rather than only as a large isolated logo.

At minimum show:
- 16px, 24px, 32px, 64px, and large-display mark behavior;
- monochrome light-on-dark and dark-on-light versions;
- favicon/app-icon crop;
- application shell placement;
- Landing masthead placement;
- email-header placement;
- social/Open Graph placement;
- mark-only and mark+wordmark forms;
- static/reduced-motion form;
- any proposed motion identity over its full start → transition → settled sequence.

Reject implementations that materially drift from the locked reference or depend on tiny internal detail, glow, blur, or animation for recognition.

## Typography direction
Typography should feel contemporary, precise, and editorial rather than "sci-fi" for its own sake.

General system direction:
- highly readable modern sans for product and transactional communication;
- strong spacing and typographic hierarchy rather than excessive font variety;
- a more expressive display treatment may be considered for Landing/brand moments if it remains coherent with the product;
- no new font dependency is approved until licensing, loading, international-character needs, and performance are reviewed.

Settings, Admin, account/recovery, and email remain trust-oriented even if the Landing uses a more expressive display voice.

### Locked wordmark appearance
The primary identity lockup reads `RenderLab` as **one continuous word**:
- `Render` is visibly heavier/bolder;
- `Lab` is lighter/regular;
- both parts share one baseline;
- mark and wordmark have clean breathing room;
- text never overlaps the mark, descriptor, or surrounding content;
- the character is a clean contemporary sans-serif rather than decorative futuristic lettering.

The exact production font family may be selected only to faithfully reproduce this locked appearance and satisfy licensing/performance requirements. Font selection is not permission to change the weight contrast, spacing, proportions, or visual character.

`THE CREATIVE LAB` is a supported descriptor lockup shown in the approved identity reference, but it is not mandatory beside the logo in every context.

## Color direction
The product should keep generated/user media visually dominant and avoid collapsing into generic “purple AI app” styling.

### Locked identity color character
The approved primary mark expression uses a luminous **cyan/blue → violet → pink/lilac** treatment as shown in the canonical reference. That color character is part of the locked identity.

Exact engineering color stops may be sampled/tuned from the reference during asset production, but productionization must not redesign the mark into a different palette without explicit user approval.

Required companion forms remain:
- full-color approved expression;
- pure black monochrome;
- pure white/inverted monochrome.

The broader application palette may still be evolved during later surface redesign work, but it must harmonize with this locked identity and keep media dominant. Changing surrounding UI colors does not authorize changing the identity treatment itself.

## Brand motion direction
Brand motion should use the same perceptual language as the product:
- preserve origin and destination;
- transform before replacing;
- use weight, snap, masking, clipping, layering, or material-like response purposefully;
- settle cleanly;
- avoid permanent visual agitation.

For the locked modular `R`, the strongest current motion hypothesis is that discrete render/experiment cells resolve into the finished mark, then remain settled. This is an extension of the identity, not yet a production animation requirement.

A moving logo is never required for basic recognition. Email, favicon, reduced-motion, low-power, and static contexts receive the resolved static identity.

Any future motion treatment must preserve the locked settled mark exactly; motion is not permission to morph the final identity into a different silhouette.

## Imagery and graphical language
Generated and user media should do most of the emotional work.

Brand graphics should:
- frame, reveal, crop, transform, sequence, or connect media;
- create depth and atmosphere around content rather than compete with it;
- favor a few ownable compositional ideas over a catalog of effects;
- remain truthful: a marketing demonstration must not imply unsupported product behavior or fabricated generation state.

The modular construction of the locked `R` may inform grids, reveal cells, sampling frames, media assembly, and transition geometry across brand surfaces without repeating the logo as decoration everywhere.

Illustrative geometry, shaders, particles, or 3D/WebGL may be explored on the Landing only when they reinforce the accepted brand idea and meet the North Star's performance/reduced-motion requirements.

## Landing page role
The Landing is the highest-expression brand surface and should be redesigned using the locked identity foundation.

The Landing should:
- make the product feel advanced before the visitor reads feature copy;
- demonstrate RenderLab's relationship to visual creation through composition and interaction, not a grid of generic feature cards;
- put compelling media and the creative workflow at the center;
- have one or a small number of memorable signature interactions rather than many unrelated effects;
- tell a clear product story from first impression to invitation/sign-in/open-Create action;
- remain useful, understandable, keyboard-accessible, touch-capable, and complete under reduced motion;
- preserve truthful closed-beta/access behavior until the product decision changes.

The identity presentation's Landing mockups remain **directional context only**. They demonstrate how the locked identity can live in a cinematic dark environment, but their exact composition, copy, controls, and layout are not accepted production Landing design.

The existing Landing implementation remains production-authoritative until a complete replacement concept and kinetic prototype are explicitly approved and implemented through the normal gates.

## Email role
Transactional/auth email is a low-motion, high-trust expression of the same brand — not a miniature version of the Landing.

Email should feel:
- unmistakably RenderLab at first glance;
- premium, calm, and concise;
- visually related to the product through mark, typography attitude, spacing, color, and tone;
- extremely clear about the requested action and security context.

Email redesign must account for the realities of email clients:
- do not depend on JavaScript, animation, WebGL, custom interaction, or modern browser layout behavior;
- use robust email-safe structure and fallbacks;
- maintain readable light/dark behavior where clients transform colors;
- preserve link visibility and plain-text meaning;
- verify representative Gmail and Outlook rendering before production acceptance where feasible.

The identity presentation's email-header lockup is part of the locked brand identity reference. The wider generated email mockup remains directional context only; its exact body layout, CTA styling, and copy are not accepted live Auth-template changes.

### Auth/security boundary
Current RenderLab Auth email behavior is part of the existing Supabase/Resend production contract rather than ordinary checked-in React page code. Before changing a live invite, recovery, confirmation, or related Auth template:
- audit the current remote template and sender configuration;
- preserve the established token-hash/confirmation-link security flow and redirect behavior;
- preserve sender/domain and deliverability requirements unless separately approved;
- preserve current anti-tracking/privacy decisions unless separately approved;
- test the real link lifecycle, not only a static email screenshot;
- do not treat visual redesign as permission to alter admission, invitation, recovery, ownership, or authentication semantics.

Brand approval for an email design does not by itself authorize editing production Auth configuration.

## Cross-surface intensity
Brand consistency does not mean identical visual intensity everywhere.

| Surface | Brand-expression role |
|---|---|
| Logo / identity | Locked static identity; optional expressive motion extension that resolves to the same mark |
| Landing | Maximum brand expression; visual storytelling and signature interaction |
| Create | Strong product expression; tactile creative instrument |
| Library / Viewer | Strong media-led expression; spatial continuity |
| Application Shell | Quietly recognizable; supports creative surfaces |
| Activity | State-led and restrained |
| Settings / Admin | Trust, clarity, typography, spacing, and subtle brand cues |
| Email | Calm, concise, unmistakably branded, technically robust |
| Favicon / OG / social | Highly recognizable identity with minimal dependence on surrounding UI |

## Brand language and copy
The verbal identity should match the visual one.

Prefer:
- short, confident statements;
- concrete product meaning;
- language about creating, shaping, continuing, keeping, and working with media;
- plain language for account/security actions.

Avoid:
- inflated claims about intelligence or magic;
- generic "unlock/unleash/revolutionize" startup copy;
- technical backend vocabulary in customer-facing brand communication;
- cleverness that makes an auth/security email less clear.

Exact marketing copy remains a design/copy decision for the Landing phase; concept-board slogans are not locked product copy except for the supported identity descriptor noted above.

## Brand R&D sequence
The visual program should proceed in this order unless the user explicitly changes it:

1. **Brand identity productionization** — reproduce the locked Lab Grid modular `R`, wordmark relationship, dark/light forms, monochrome companions, app icon/favicon, and approved color character as precise production-safe assets without visual reinterpretation; compare side-by-side against the canonical reference.
2. **Landing Brand Experience R&D** — use the locked identity to produce the complete desktop/mobile visual concept plus signature temporal prototype.
3. **Email Brand System R&D** — design representative invitation/recovery/account email patterns using the locked identity while preserving Auth/security contracts.
4. **Create Visual R&D** — continue the already-open Create interaction-language task using the locked brand foundation.
5. **Product rollout planning** — only after approved evidence exists, define bounded implementation phases for the agreed surfaces and shared brand primitives.

Research/audit work for later items may happen earlier when useful, but **production implementation should not outrun the locked brand foundation**.

This ordering does not itself create Phase 23/Cycle 5 and does not authorize deployment.

## Brand Identity R&D 0.1 acceptance gate
The design-selection portion of Brand Identity R&D 0.1 is complete. The identity itself is visually locked; productionization remains a separate engineering/fidelity step.

Current gate state:
- current-state audit: complete;
- reference matrix: complete;
- materially different first-pass concepts: complete;
- initial cross-surface concept exploration: complete;
- selected direction: complete;
- inaccurate first vector reconstruction: explicitly rejected/superseded;
- corrected/refined modular `R` identity: **explicitly approved and `LOCKED` by the user**;
- canonical repository visual reference + binding lock rules: recorded;
- production master SVG/assets: not yet implemented;
- small-size/browser fidelity validation of production assets: not yet run;
- optional motion evidence: not yet required/approved;
- production identity rollout: not started.

No production asset/template may be called changed until implementation and exact-head validation actually prove it.

## Engineering and release integrity
Brand work does not lower RenderLab's engineering bar.

When locked brand assets are implemented:
- preserve existing product/auth/security/data behavior;
- keep accessible names and semantics independent from decorative marks;
- keep readable contrast and focus behavior;
- preserve reduced-motion/static equivalents;
- review asset weight, font cost, canvas/WebGL cost, and any new runtime dependency;
- run every relevant exact-head build/UI/visual/lifecycle workflow attached to the implementation;
- compare production candidates side-by-side against the locked identity reference separately from functional QA;
- preserve configured test-fixture ownership and cleanup;
- update favicon, Open Graph, shell, Landing, and other real touchpoints only when in the approved implementation scope;
- treat production Auth-template changes as a separately verified configuration operation;
- require explicit production deployment authorization.

Passing tests cannot substitute for brand/design fidelity, and brand approval cannot substitute for passing tests.

## Current decision
The user has explicitly authorized the broader visual/branding program and has now **LOCKED the corrected/refined Lab Grid modular `R` identity**.

Canonical change-control rule:

> **Reproduce the locked reference; do not reinterpret it.**

Locked now:
- exact visual direction and module relationship of the corrected/refined Lab Grid modular `R`;
- the four-module silhouette and negative-space character documented in `design/brand/identity-lock-2026-09-10.md`;
- `RenderLab` wordmark appearance with `Render` heavier and `Lab` lighter as one continuous word;
- clean non-overlapping mark/wordmark alignment;
- the approved cyan/blue → violet → pink/lilac primary mark character;
- black and white monochrome companions preserving the same silhouette;
- dark and light primary lockup relationship;
- dark rounded-square app-icon direction;
- `THE CREATIVE LAB` as a supported descriptor lockup;
- treating Landing, product, and email as one brand system with different expression levels;
- the North Star's design-before-code, fidelity, accessibility, and engineering gates.

The identity may not be visually redesigned, substituted, or “improved” by a future session unless the user explicitly reopens the locked identity decision.

Still not authorized by this lock alone:
- replacing production identity files before faithful asset implementation and validation;
- a production Landing redesign;
- live Auth email-template changes;
- a new production dependency;
- product behavior, route, backend/schema/infrastructure changes;
- Phase 23/Cycle 5 implementation;
- deployment.