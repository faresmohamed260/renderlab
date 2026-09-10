# RenderLab Identity Lock — 2026-09-10

**Status:** `LOCKED` visual identity reference — production implementation pending  
**Authority:** `docs/ui/BRAND_SYSTEM.md` + this lock record  
**Task:** #151  
**User approval:** explicit — “yep that's it, lock it down and don't mess it up”

## Canonical visual reference

The canonical visual target is the **corrected/refined Lab Grid modular `R` board** approved by the user in the 2026-09-10 design review.

Repository-preserved lockup reference:
- `design/brand/lab-grid-approved-lockup-2026-09-10.webp`
- SHA-256: `f69df5d341fc5fe7e5e74e8eca0d02e6aa74b1ddae7e4ced4b682c638088efd5`

Exact original approved generated board reviewed by the user:
- dimensions: `1448 × 1086`
- SHA-256: `ad05e2d83bed183ebfe8c319fa2b8b05981a485d1a8603c2e0dbac09e3c84d62`

The repository WebP exists to preserve the approved visual reference compactly. It is a reference image, not a source vector. Production vector assets must reproduce the locked appearance rather than inventing a new interpretation.

## What is locked

### 1. Modular `R` mark
The mark is the exact **Lab Grid modular `R` visual direction shown in the canonical reference**.

Its defining construction is:
- a separated **upper-left horizontal rectangular module**;
- a **upper-right rounded/bowl module** that completes the `R` counter/bowl relationship;
- a separated **lower-left square module**;
- a separated **lower-right curved/quarter-form leg module**;
- deliberate negative-space gaps between the four major modules;
- a compact, upright overall `R` silhouette.

The modules simultaneously suggest render/image blocks and lab experiment cells. That semantic connection is part of the identity, but **the visual proportions and arrangement are controlled by the approved reference, not by a new verbal reinterpretation**.

Do not replace this with:
- the earlier solid/stem-heavy monochrome reconstruction;
- a thin-line `R`;
- a continuous monogram;
- a generic pixel-font `R`;
- extra blocks, cuts, gaps, or flourishes not present in the approved reference;
- a different bowl or leg construction merely because it is easier to vectorize.

### 2. Wordmark relationship
The approved lockup reads **`RenderLab` as one continuous word**.

Locked visual treatment:
- `Render` carries the heavier/bolder weight;
- `Lab` carries a visibly lighter/regular weight;
- both parts share one baseline and read as one name;
- spacing is clean and intentional;
- there is **no overlap** between mark, wordmark, descriptor, or surrounding content;
- the type is a clean contemporary sans-serif, not a decorative sci-fi face.

The exact production font file/family may be selected during implementation only to faithfully reproduce this approved appearance and satisfy licensing/performance requirements. That technical choice is **not permission to change the visual character, relative weights, spacing, or proportions**.

### 3. Color expression
The approved primary color expression is the luminous **cyan/blue → violet → pink/lilac** treatment shown on the modular mark.

This color treatment is now a locked visual target. Exact engineering color-stop values may be sampled and tuned from the canonical reference during asset production, but the productionization step must not redesign it into another palette or a generic all-purple gradient without explicit user approval.

Required companion forms:
- full-color approved expression;
- pure black monochrome;
- pure white/inverted monochrome.

The identity must remain recognizable without glow, blur, or animation.

### 4. Primary dark/light lockups
The approved board shows and locks both:
- a dark presentation with the luminous modular `R` and light `RenderLab` wordmark;
- a light presentation with the luminous modular `R` and dark `RenderLab` wordmark.

The mark-to-wordmark relationship, baseline, breathing room, and hierarchy must remain faithful to the reference.

### 5. App icon / favicon direction
The approved app-icon treatment is the luminous modular `R` centered on a dark rounded-square field.

A favicon may require raster/optical tuning for tiny sizes, but it must preserve the same four-module identity and must not substitute a different `R` design.

### 6. Supporting descriptor
`THE CREATIVE LAB` is an approved supporting descriptor shown in the identity presentation. It is **supported brand lockup copy**, not a mandatory tagline that must appear beside the logo in every context.

Marketing headlines and Landing copy remain separate future decisions.

## Superseded / rejected artifact

`design/brand/lab-grid-r-mark-v0.1.svg` and `design/brand/lab-grid-r-pressure-test-v0.1.svg` are **REJECTED / SUPERSEDED geometry experiments**.

The user explicitly rejected that reconstruction because it did not match the agreed logo and its presentation had incorrect/overlapping text. These files are retained only as R&D history and **must never be used as implementation source or fidelity authority**.

## Fidelity rule

For any future production identity implementation:

> **Reproduce the locked reference; do not reinterpret it.**

A candidate fails brand fidelity if it materially changes any of the following without explicit user approval:
- the modular `R` silhouette;
- the four-module arrangement or negative-space relationships;
- the bowl/leg character;
- the mark proportions;
- the `Render` bold / `Lab` light wordmark relationship;
- the mark-to-wordmark spacing/alignment;
- the approved cyan/blue/violet/pink primary color character;
- the dark rounded-square app-icon treatment.

Implementation should use vector tools and rendered side-by-side comparison against the canonical reference. Do not reconstruct the logo from memory or from the rejected v0.1 SVG.

## What this lock does not authorize

This identity lock does **not** by itself:
- replace `public/renderlab-mark.svg`;
- replace `src/app/icon.svg`;
- change `src/components/brand/renderlab-brand.tsx`;
- redesign production Landing code;
- change live Supabase/Resend Auth email templates;
- change product behavior, routes, backend, schema, infrastructure, or dependencies;
- authorize Phase 23/Cycle 5;
- authorize production deployment.

Those remain implementation/release operations with their normal exact-head and fidelity gates.

## Change control

This identity is `LOCKED`. Future sessions must treat the canonical reference and this document as authoritative. Do not modify or “improve” the identity unless the user explicitly reopens the RenderLab identity decision.