# Create Instrument Continuum v0.1

Standalone repository-backed design prototype for RenderLab issue #148.

## Boundary
- Design R&D only.
- Not a production `/create` route.
- No backend, Supabase, R2, Auth, provider, worker, or generation API calls.
- No production dependency adoption.
- All media/job states are deterministic fixtures used to evaluate composition and motion.

## Run
From the repository root:

```bash
python3 -m http.server 4173 --directory .
```

Then open:

`http://127.0.0.1:4173/design/prototypes/create-instrument-continuum-v0.1/`

Query-state shortcuts:
- `?state=image`
- `?state=video`
- `?state=references`
- `?state=advanced`
- `?state=generating`
- `?state=result`

## Interaction review
- switch Image / Video;
- add a reference, then add a second reference;
- drag the second source tile onto the first or use `Make primary`;
- remove a reference;
- open/close Advanced;
- activate Generate and observe generating → result continuity;
- navigate controls with keyboard;
- test at 390px and with `prefers-reduced-motion: reduce`.

The source tiles use drag/drop only as a supplementary pointer mechanic. `Make primary` remains the deterministic keyboard/touch-equivalent action.
