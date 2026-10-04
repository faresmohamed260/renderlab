# Production product walkthrough

Authorized by Fares on 2026-10-04 and completed against the live closed-beta domain.

## Verified capture

- Workflow run: [Production Complete User Journey #4](https://github.com/faresmohamed260/renderlab/actions/runs/37212557558)
- Harness commit: `88acf6c5c563b4a5919b4aecd4026135934e30b3`
- Verified production source: `8e5d066978035c3c0e686fe6e3eec2071135ab30`
- Real operations: create image, edit image, animate image, create video
- Real durable upload: one PNG uploaded through the production Library flow
- Cleanup: passed; eleven tracked R2 objects checked and zero contracted database/Auth residue
- Evidence artifact: `production-complete-user-journey-37212557558-1`, digest `sha256:5d0c6e88d6ce808147f50a1ea6a664fe0dc5da566e94e8bcdf692c844b4a58a7`

## Published media

The repository README uses four production screenshots and a 44-second silent walkthrough assembled exclusively from the verified production capture. It covers the landing page, upload, Create, Activity, Media Viewer, image editing, animation, text-to-video, Library, and account surfaces. No credentials, access tokens, request headers, or customer content appear in the published assets.

The optional recording mode remains manual-only. It preserves the workflow's exact production-SHA input, explicit four-generation acknowledgement, serialized execution, isolated member fixture, and unconditional cleanup.
