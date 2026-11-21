# Main integration — November 21, 2026

The user requested merging all work from the last couple of days that had not reached main, then pushing Git. A fetch and ancestry audit found two outstanding branches: `codex/alley-killer-kai` (snapshot `94c9048`, Christmas gameplay/code commit `66be244`) and `codex/kai-workshop-generated-art` (`0a8b050`). The other local and remote branch tips were already ancestors of main. The audit included the linked worktrees; their working trees were clean.

The branches were combined on `codex/christmas-main-integration` before updating main. Content conflicts were resolved by retaining the newer wallet, purchasable Kai Workshop, level results, camera/combat effects, supply crates, route pacing and Alley music/dance systems, together with the Christmas character, story, code and calendar availability. Kai's arm remains a power-up earned in the current campaign, with support for older saved arm metadata.

The read-only power-up/companion animation viewer remains available as **Art Gallery**, separately from the wallet-backed **Kai’s Workshop**. Its styles are scoped to `combat-gallery` so the two interfaces do not overwrite one another. Animated campaign pickup art is retained. The title toolbar and code field fit desktop and phone layouts. Native-weapon heroes cannot spend Gold on incompatible weapon/shield supplies; extra lives remain available.

`SantaKisComing` is an exact-case preview code on the title screen and roster. The deployed game automatically enables Christmas from November 26, 2026 at Denver midnight through Christmas Day, with an exclusive end at midnight on December 26. Saved Christmas runs remain loadable after expiry. See [Christmas preview notes](christmas-v1/preview.md).

## Verification

- Production TypeScript/build passed; the existing Phaser vendor-size advisory remains.
- Christmas code/calendar/storage unit checks and all 442 art-export checks passed.
- All 16 Christmas browser scenarios passed on the merged production build: code entry, story, movement/combat, elves, pause, post-expiry saves, code-free public activation, phone menus, all campaign stages, mobility, defeat/respawn and boss victory.
- The read-only Art Gallery passed all thirteen power-up previews and eleven companion action loops, plus controls, keyboard/focus, phone layouts, reduced motion and in-game artwork checks.
- Generated Kai Workshop artwork passed nineteen catalog items and thirteen action loops, purchases/reload, cosmetics, specials, buddies, flight and Alley integration.
- Shop purchase checks passed confirmation, duplicate-charge protection, supplies, permanent cosmetics, storage retry, reload, next-level handoff and phone layout.
- Native supply compatibility passed for Killer Klause and Turkey King; Gold remains unchanged on incompatible supplies and extra lives work.
- Level results passed checkpoint totals, summary reload, duplicate-credit protection, storage retry, manual continuation, phone layout, persistent wallets and finale rewards. This existing suite requires Vite's development server because it imports TypeScript modules in its browser assertions; other browser checks used the built preview.
- The standard develop-web-game smoke client passed on the merged build; its screenshot and text state are in `output/christmas-merged-smoke/`.
- Turkey King progression passed on the merged build, including real boss defeat, native weapon retention, the results/shop handoff, Alley interlude and level-two loading. Its test now follows the current results and shop screens.

Browser evidence remains under `output/`, outside the shipped assets. These checks do not certify a physical phone or a deployed hosting build.
