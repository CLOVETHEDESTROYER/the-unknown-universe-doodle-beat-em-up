# Run-and-gun direction

## Research findings

- Studio MDHR describes *Cuphead* as a run-and-gun game built around demanding one-on-one bosses. Its team tuned controls, hitboxes, camera behavior, weapon balance, and attack patterns together. Patterns vary their order, while each attack must remain readable. [Studio MDHR: What kind of game is Cuphead?](https://studiomdhr.com/what-kind-of-game-is-cuphead/)
- The core loop combines jumping, dashing, shooting, and parrying distinct pink targets to build a special meter. [Xbox Wire gameplay preview](https://news.xbox.com/en-us/2015/06/18/xbox-cuphead-will-kill-you-with-cuteness/?ver=3.7.1)
- The creators planned boss attacks and phases with rough art before committing to final animation. Escalation, attack timing, and readable hitboxes shaped the animation. [Game Developer interview with Studio MDHR](https://www.gamedeveloper.com/business/road-to-the-igf-studio-mdhr-s-i-cuphead-i-), [Xbox anniversary interview](https://news.xbox.com/en-us/2023/09/27/cuphead-xbox-anniversary-update-exclusive-to-xbox-fans/?ver=3.7.1)
- Level backgrounds can foreshadow upcoming terrain, but foreground threats must stay legible. [iLLOGIKA co-developer postmortem](https://www.gamedeveloper.com/programming/collaborating-on-an-indie-sensation---cuphead)
- The hand-drawn look comes from expressive ink lines, frame-by-frame animation, digital color, and subtle imperfection. Our version should use the game's existing doodle characters and world, with original drawings and effects. [Game Developer art interview](https://www.gamedeveloper.com/art/how-i-cuphead-i-nailed-the-look-and-feel-of-classic-1930s-cartoons), [GDC animation talk](https://gdcvault.com/play/1024315/Animation-Bootcamp-Cuphead-Process-and)

## Current game and staged work

The game already has responsive running, jumping, crouching, melee combos, enemy tells, companion shots, checkpoints, and end-of-level guardians. X God now has a ranged option with a visible source. The long Levels 1 and 2 still need deliberate encounter pacing after the new combat loop is tested.

1. **Move and shoot — implemented.** X God can hold **C** on a keyboard or **S** on the touch controls to fire small original ink shots while running and jumping. **Space/A** keeps the existing melee combo. Shots deal 1 damage, fire every 230 ms, disappear after 900 ms, and allow at most three on screen.
2. **Visible shot source — current playtest.** X God starts with a hand-drawn ink marker blaster, attached near his forward hand. Pellets spawn from its nozzle. Once he equips the Fire Sword, the same input fires a warm-colored blade beam from the sword tip. The other characters keep their own attack identities instead of receiving the same generic rapid-fire tool. Review prop position during idle, running, and jumping, plus whether each shot clearly comes from the tool.
3. **Level 1 enemy roles — next.** Give walkers an approach and brief recovery, dashers a clear charge lane and punish window, and giants a slower armored state with an exposed moment after a slam. Keep each tell visually distinct, with consistent timing and rewards for reading it. Tune pellet damage against each role before increasing enemy counts.
4. **Aim and parry.** Add upward/diagonal aiming without interrupting movement, then a timed aerial parry against a clearly marked class of *original* pink threats. Define a useful reward meter after the timing feels fair; this opens better counterplay against flyers.
5. **Level 1 guardian.** Prototype two or three escalating phase patterns using simple shapes first. Add clear tells, a recovery window, and a readable health transition before drawing final animation frames.
6. **Level 1 route.** Rework the long route into escalating encounter segments with safe introductions, mixed threats, short recovery stretches, and visual hints for upcoming platform changes. Carry the learned pattern to later levels only after playtesting.
7. **Animation and sound.** Give original X God, Dinio, enemies, and guardians anticipation, impact, recovery, and expressive idle frames. Keep silhouettes and projectiles readable against the existing hand-drawn scenery; add music and effects that fit this game's own identity.

Stop after each milestone for a player feel check before tuning or expanding the next one.
