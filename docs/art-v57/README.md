# Exact adult age counterparts

This expansion gives the existing adult portrait library direct, identity-preserving age counterparts. It does not count a matching ancestry, coat or complexion as the same person.

`adult-inventory.json` describes all 8,224 non-modern adult portraits: 8,192 original portraits plus the 32 Human and Elf light-lifecycle adult supplements. They occupy 130 source atlases. Each source is an observed 8 × 8 atlas; the supplements register only their actual adult cells.

`generation-queue.json` contains 390 separate built-in image generation edit jobs. Completing all three later stages requires 24,672 registered portraits. The queue status records what remains missing, without inventing assets or claiming generation is complete.

| Game stage | Game ages | Illustrated age |
| --- | --- | --- |
| Mature | 40–54 | About 45 |
| Older | 55–64 | About 58 |
| Elder | 65+ | About 72 |

## Generate and register

1. Run `node scripts/queue-aged-portraits-v57.mjs` to refresh the complete adult inventory and prompt queue. This does not generate or modify images.
2. Inspect the job's adult reference with `view_image`, then perform the edit using built-in `image_gen`. The original atlas is the edit target; preserve its 64 identities and their cell order. For a light-lifecycle supplement, the prompt specifies the adult cells to age and leaves the other stages unchanged.
3. Inspect the generated native image. Confirm every selected adult cell preserves its recognizable identity, ancestry, presentation and phenotype, and is visibly the requested age. Do not admit missing, repeated, rearranged or insufficiently aged cells.
4. Write a visual review JSON with the schema below. Save the exact prompt as a text file if it differs from the queue prompt.
5. Run `node scripts/encode-aged-portraits-v57.mjs --job JOB_ID --source IMAGEGEN_OUTPUT.png --review REVIEW.json --prompt-file EXACT_PROMPT.txt`. Omit `--prompt-file` only when the exact queue prompt was used.
6. Run `node scripts/refresh-aged-portrait-manifest-v57.mjs` after a batch to consolidate all per-atlas receipts. Per-atlas receipts are written atomically. Independent atlases can encode concurrently; refresh aggregate manifests after the complete batch settles.
7. Rebuild the age catalog and run its native asset, identity mapping and runtime checks before packaging.

```json
{
  "reviewer": "Name or agent task",
  "reviewedAt": "ISO date-time",
  "grid8x8": true,
  "identityPreserved": true,
  "ageAppropriate": true,
  "presentationPreserved": true,
  "phenotypePreserved": true,
  "notes": "Record the actual native image observations."
}
```

Any `false` review field rejects the output before writing assets. An omitted review leaves the receipt `pending-visual-review`, which must not enter the runtime catalog. Technical crop verification does not establish the likeness or apparent age of a face.

The encoder preserves native dimensions and mechanically encodes to AVIF at quality 85, effort 6, 4:4:4. It never resizes, recolors, repaints or overlays the image. It decodes the resulting native bitmap only to measure the actual gutters, opacity, luminance and unique cell hashes. The complete original imagegen output is retained unchanged under `reference-art/aged-v57/source/{ancestry}/`; the generation record preserves its original imagegen path, prompt, reference and hashes. Rejected images are not copied into this directory.

Per-atlas receipts live in `registration/`; the combined array is `aged-registration.json`. Each accepted entry carries its precise `adultKey`, stage and observed native rectangle. Existing adult IDs and explicit saved portrait selections remain stable. `--verify-only` runs encoding and native validation without writing files or accepting artwork.

The generated runtime catalogue packs repeated identity labels and reconstructs the same public objects at module load. The hosted offline recipe reuses one copy of each media file and reconstructs the exact self-contained HTML when downloaded. Native PNG sources, exact generation prompts and visual reviews remain retained separately.

The complete standalone byte parts are reproducible build output and are not tracked in source. Run the build before offline or compiled verification; the original PNG paintings, encoded runtime assets, generation provenance and recipes remain tracked.

Only adult positions49–64 are registered from either light-lifecycle supplement. Some unused adolescent cells show aging drift despite the generation prompt; those cells never enter the portrait catalogue or game. Supplement review notes explicitly scope acceptance to the16 adult identities.
