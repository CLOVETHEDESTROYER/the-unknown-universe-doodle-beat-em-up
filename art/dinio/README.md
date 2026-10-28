# Dinio companion model

`blender/dinio-v1.blend` is an editable side-view pink dinosaur prototype. Its camera and lighting produce the transparent 320 x 320 walk and attack frames in `public/companions/dinio/`.

The platformer uses the hybrid sprite sheets in `public/companions/dinio/hybrid-v1/`. They were generated with the built-in image generator by compositing Dinio's original hand-drawn walk and attack artwork over the Blender pose and volume references, then normalized with `scripts/pack_dinio_hybrid.ps1`. The prompt preserved the pink pencil texture, black sketch outline, cream belly, long neck and tail, toothy face, and jeweled crown on a transparent background. The walk sheet has six poses; the attack sheet has three.

The generated source sheets live in `art/dinio/hybrid-v1/`. The original hand-drawn strips remain at `public/dinio_walk.png` and `public/dinio_attack.png`, and the Blender-only renders remain in `public/companions/dinio/`.

To regenerate the sprites with Blender 5.2 or newer, run:

```powershell
blender --background --python scripts/create_dinio_blender.py
```

His Level 1 unlock orb and shot also use the original game art.
