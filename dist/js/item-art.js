import { resolveGearArtwork, resolveCarriedArtwork } from './inventory-art-v39.js';

const escapeAttribute = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Keep the numeric export for existing callers; rendering always uses the full
// shared atlas result so equipment recovered as loot can choose the gear sheet.
export function carriedArtwork(row) { return resolveCarriedArtwork(row).index; }
function renderArtwork(art, e) {
  // The shared stylesheet owns each image URL. This also keeps the standalone
  // game's embedded atlas bytes out of every individual item element.
  return `<span class="item-art${art.atlas === 'supplies' ? ' supplies-art' : ''}" role="img" aria-label="${e(art.label)} illustration" data-art-atlas="${art.atlas}" data-art-key="${art.key}" data-art-index="${art.index}" data-art-column="${art.column}" data-art-row="${art.row}" style="background-size:${art.backgroundSize};background-position:${art.backgroundPosition}"></span>`;
}
export function renderGearArt(item, e = escapeAttribute) { return renderArtwork(resolveGearArtwork(item), e); }
export function renderCarriedArt(row, e = escapeAttribute) { return renderArtwork(resolveCarriedArtwork(row), e); }
