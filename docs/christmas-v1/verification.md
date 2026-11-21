# Christmas art pack verification — November 20, 2026

- `python scripts/pack_christmas_v1.py`: passed. 104 authored frames, three backgrounds, twelve storyboard panels. Source crops retain whole silhouettes and glows across grid boundaries.
- `python scripts/audit_christmas_v1.py`: passed, 442 export checks. Sheet dimensions, nonempty frames, transparent margins, distinct pose exports, valid animation indices/rates, individual props, story images/captions, presentation artwork, and release dates verified. Glow effects intentionally retain partial alpha.
- `npm run build`: passed, including TypeScript. Vite reports its existing large Phaser vendor chunk warning. No application code was changed by this asset pass.
- Playwright CLI gallery review: passed on desktop (1440 × 1050) and phone width (390 × 844). All 29 presentation images and all six animated sheet previews load. No horizontal overflow. Pause, reload-action selection, single-frame stepping, and mirrored facing respond correctly. Reduced-motion preference starts playback paused. Final page console has zero errors or warnings.
- Visual inspection: character/card identity, seven sheet contact previews, the three backgrounds, and all twelve storyboard panels. Desktop and phone gallery screenshots are in `output/playwright/christmas-v1/`.

The gallery can be opened directly from `public/seasonal/christmas-v1/review.html` or served from the project's public directory. The browser automation tool requires an HTTP preview; the verification used a localhost-only server.

The checks above covered asset integrity and the review gallery during art production. Playable preview integration followed on November 21; see `preview.md` for the exact-case code, automatic calendar window, runtime verification, and remaining deployment step.
