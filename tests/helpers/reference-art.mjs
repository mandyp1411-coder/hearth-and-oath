// The original paintings and their registration records live in `reference-art/`,
// which is not shipped with the game and is often absent from a source checkout.
// Tests that read it declare so with `skip: needsReferenceArt` and are skipped cleanly.
import { existsSync } from 'node:fs';

export const referenceArtPath = new URL('../../reference-art/', import.meta.url);
export const hasReferenceArt = existsSync(referenceArtPath);
export const needsReferenceArt = hasReferenceArt ? false : 'reference-art/ is not present in this checkout';
