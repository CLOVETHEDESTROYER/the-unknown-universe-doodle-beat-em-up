# Checkpoint retry health

Every ground-stage checkpoint respawn restores health to 100. This includes fall resets that subtract 35 health without consuming a life: previously a 40-health fall returned the hero with only 5 health, creating repeated one-hit deaths near the Void Regent.

Life-loss behavior is unchanged: lethal damage/falls consume a life; nonfatal fall resets do not. Equipment loss, checkpoint location, supply-crate collection and final Game Over behavior are unchanged. Health still displays zero during the collapse animation, then resets when the playable hero returns. Ordinary damage and loading a saved campaign do not grant a refill.

The drawn-hero respawn explicitly restores full health when re-enabling the physics body. Legacy X-God's animated respawn also refreshes its damage-protection timestamp, matching the existing brief protection on drawn heroes. Flight already restores hull on retry and is unchanged.

Verification: `npm run build`; `node scripts/test_checkpoint_retry_health.mjs`. Checks Level 6 low-health falls, lethal falls/hits, another hero, Level 1, checkpoint/life preservation, initial damage immunity, subsequent normal damage and re-entering the real Void Regent fight after a retry. The boss fixture is deliberately not used because it resets health and would hide this regression.
