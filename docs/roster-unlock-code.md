# Secret roster unlock

On **Pick Your Player**, enter:

**↑ ↓ ↑ ↓ ← → ←**

Use the on-screen direction pad, keyboard arrow keys, or a mixture of both.
The confirmation **“Secret code accepted! All characters unlocked.”** enables
every character, including Killer Kai. The unlock is saved for future visits
to the same site in that browser. If browser storage is unavailable, it lasts
for the current session.

The code is active only on character select. Leaving that screen or switching
away from the game clears partial entries. Held-key repeats do not count as additional steps.
There is no time limit, and a wrong entry can be followed by the complete code.
Finishing the campaign as X God still unlocks the roster normally.

`components/RosterUnlockPad.tsx` owns code input and confirmation. `App.tsx`
shares the persistent unlock callback with campaign victory. No win state,
equipment, or level progress is granted by the code.

Run `node scripts/test_roster_code_v1.mjs` against the production preview at
port 4381. `GAME_TEST_URL`, `GAME_TEST_BROWSER`, and `GAME_TEST_EXECUTABLE` can
override the preview/browser. The suite covers exact and wrong entries, input
repeat/screen/focus boundaries, persistence, denied storage, all seven cards,
phone/tablet layout, touch input, and playing a newly unlocked hero.
