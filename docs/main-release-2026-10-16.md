# Main replacement — 2026-10-16

The user authorized preserving the old main, replacing main with the current game and pushing to GitHub.

## Backup

- Repository: `CLOVETHEDESTROYER/the-unknown-universe-doodle-beat-em-up`.
- Previous remote main: `74126add1b20bff6dce1211c0c582e28f4b680d5` (`Polish level pacing and X-God dash`).
- Backup branch: `codex/backup-main-2026-10-16`.
- The backup was pushed and its remote SHA confirmed equal to main before preparing the replacement.

## Replacement

The current `codex/platformer-pivot` working tree is the intended replacement: six-stage platformer/flight campaign, generated backgrounds/enemies/bosses, companions, playable roster, equipment/death art, effects and supplied music. Runtime assets, editable art/Blender sources, prompts, scripts and documentation are included. Local captures/output, Python caches, Blender autosave copies, dependencies and build output are excluded. The existing API-key `.env` stays on disk but is removed from the replacement's tracked files; it remains in old history and the backup.

Remote main had two legacy-game commits newer than this work's starting point. An intentional `ours` history merge records that latest main as an ancestor while retaining the complete current game tree. Main can then advance normally to the replacement without force pushing or rewriting history. The backup preserves all previous main content, including its runtime/dependency changes, exactly.

Production build is run before publication. Existing milestone verification and outstanding gameplay feedback are in `progress.md`; no new gameplay tests are requested for this publishing step. Pushing main may trigger any deployment already configured for the repository; this task does not provision or separately invoke hosting.

To inspect the previous game without disturbing current work, create a separate checkout/worktree at the backup branch. Restoring it to main should be a separately reviewed operation.
