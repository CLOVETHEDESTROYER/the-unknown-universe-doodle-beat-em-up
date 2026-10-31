# Unnamed shadow kid

Approved version B is preserved in `art/shadow-kid-v1/approved-design.png`. He is nine years old, wears the T-shirt, and has the forward/upward pointed bangs. His permanent name remains undecided; the roster displays `???` with `Shadow Kid` as the description.

The first playable integration includes 40 generated character frames, strengthened running, and a generated black-hole projectile. Use Space/C/HIT for the regular throw (3 damage); X/SP fires Void Burst (7 damage, up to three enemies, five-second cooldown). Both use ordinary projectile collision, boss guards, expiry and damage rules. Equipment overrides the regular throw until it breaks. Void Drop uses the shared double-jump/slam system. Ground campaign, flight boarding/pilot, hurt, defeat, respawn and victory use his own art.

He follows existing roster unlock rules. Developer preview: `http://127.0.0.1:4391/?autostart=1&unlockRoster=1&character=shadow_kid&level=1`.

Rebuild art: `python scripts/pack_shadow_kid_v1.py`. Review: `art/shadow-kid-v1/preview.html`. Regression: `node scripts/test_shadow_kid_v1.mjs` with `GAME_TEST_URL` pointing at a running local server. No online deployment is included.
