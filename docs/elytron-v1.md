# Playable Elytron

Elytron uses the approved option 01 design and the yellow-and-black selection card. He follows the existing roster unlock rules. The normal attack is a charged-fist melee combo; crouch, jump, double jump, Butt Bomb, equipment pickups, damage, death/respawn, boss victory and boarding/piloting/disembarking all retain his own artwork.

Pulse Storm uses the existing X key / SP touch button. It charges for 320 ms, fires six yellow electrical pulses 110 ms apart, then recovers. Each traveling pulse deals 2 damage through the ordinary projectile collision and boss-guard rules. Cooldown is six seconds. Facing is captured when the cast begins. The scene clock controls the whole volley, so pause freezes firing; cancellation on damage/death or scene teardown clears owned shots. Pulse Storm does not consume equipped weapon durability.

Runtime art is in public/characters/elytron-v1. Ground movement and flight use trimmed lossless WebP atlases with pages at most 1024 square, avoiding wide PNG strips on mobile GPUs. Source drawings, generation prompts, normalized PNG strips and the review preview are retained in art/elytron-sprites-v2. The shared legacy brawler does not have this new art pipeline; selecting Elytron always uses the modern campaign renderer.

Validation: scripts/test_elytron_v1.mjs exercises real roster selection, six campaign stages, run/crouch/melee, double jump and slam, six-pulse damage, pause/cooldown, touch firing left, equipment, hurt/death/respawn, actual boss victory, and existing hero startup. Use GAME_TEST_URL, GAME_TEST_BROWSER and optional GAME_TEST_EXECUTABLE to choose the local server and browser. Screenshots and verification results are written to output/elytron-integration.
